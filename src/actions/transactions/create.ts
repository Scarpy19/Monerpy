import { defineAction } from "astro:actions";
import { z } from 'astro:schema';
import { prisma } from '@prisma/index.js';
import { formatDateTimeLocal, getCurrentDateTime } from '@lib/date-utils.ts';

const createTransaction = defineAction({
    accept: 'form',
    input: z.object({
        accountId: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val), "Account is required."),
        categoryId: z.string().nullable().transform(val => val && val !== '' ? parseInt(val) : undefined),
        date: z.string().min(1, "Date is required."),
        name: z.string().trim().min(1, "Transaction name is required."),
        amount: z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val) && val > 0, "Amount must be a positive number."),
        type: z.enum(['Income', 'Expense']),
        tags: z.string().nullable().optional().transform(val => val ? val.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []),
        newCategory: z.string().nullable().optional().transform(val => val?.trim() || undefined),
        newCategoryColor: z.string().optional().default("#6172f3")
    }),
    handler: async (input, context) => {
        try {
            const user = context.locals.user;

            if (!user) {
                return { ok: false, error: "Authentication required." };
            }

            // Get user with family info
            const userWithFamily = await prisma.user.findUnique({
                where: { id: user.id },
                include: { family: true }
            });

            if (!userWithFamily?.familyId) {
                return { ok: false, error: "User must belong to a family to create transactions." };
            }

            // Verify account belongs to user's family
            const account = await prisma.account.findFirst({
                where: {
                    id: input.accountId,
                    familyId: userWithFamily.familyId,
                    deletedAt: null
                }
            });

            if (!account) {
                return { ok: false, error: "Account not found or not accessible." };
            }

            let categoryId = input.categoryId;

            // Handle new category creation
            if (input.newCategory && !input.categoryId) {
                const existingCategory = await prisma.category.findFirst({
                    where: {
                        name: input.newCategory,
                        familyId: userWithFamily.familyId,
                        deletedAt: null
                    }
                });

                if (existingCategory) {
                    categoryId = existingCategory.id;
                } else {
                    const newCategory = await prisma.category.create({
                        data: {
                            name: input.newCategory,
                            color: input.newCategoryColor,
                            familyId: userWithFamily.familyId,
                            createdAt: getCurrentDateTime(),
                            updatedAt: getCurrentDateTime()
                        }
                    });
                    categoryId = newCategory.id;
                }
            }

            // Create transaction
            const transaction = await prisma.transaction.create({
                data: {
                    accountId: input.accountId,
                    userId: user.id,
                    categoryId,
                    date: formatDateTimeLocal(input.date),
                    name: input.name,
                    amount: input.amount,
                    type: input.type,
                    createdAt: getCurrentDateTime(),
                    updatedAt: getCurrentDateTime()
                }
            });

            // Handle tags
            if (input.tags.length > 0) {
                const tagConnections = [];

                for (const tagName of input.tags) {
                    let tag = await prisma.tag.findFirst({
                        where: {
                            name: tagName,
                            familyId: userWithFamily.familyId,
                            deletedAt: null
                        }
                    });

                    if (!tag) {
                        tag = await prisma.tag.create({
                            data: {
                                name: tagName,
                                familyId: userWithFamily.familyId,
                                createdAt: getCurrentDateTime(),
                                updatedAt: getCurrentDateTime()
                            }
                        });
                    }

                    tagConnections.push({ id: tag.id });
                }

                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        tags: {
                            connect: tagConnections
                        }
                    }
                });
            }

            // Update account balance
            const balanceChange = input.type === 'Income' ? input.amount : -input.amount;
            await prisma.account.update({
                where: { id: input.accountId },
                data: {
                    balance: {
                        increment: balanceChange
                    }
                }
            });

            return { ok: true, transaction };

        } catch (error) {
            console.error("Error creating transaction:", error);
            return { ok: false, error: "Failed to create transaction." };
        }
    }
});

export { createTransaction };