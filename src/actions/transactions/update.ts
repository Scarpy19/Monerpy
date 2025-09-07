import { defineAction } from "astro:actions";
import { z } from 'astro:schema';
import { prisma } from '@prisma/index.js';
import { formatDate, getCurrentDateTime } from '@lib/date-utils.ts';

const updateTransaction = defineAction({
    accept: 'form',
    input: z.object({
        id: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val), "Transaction ID is required"),
        accountId: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val), "Account is required"),
        categoryId: z.string().nullable().transform(val => val && val !== '' ? parseInt(val) : undefined),
        date: z.string().min(1, "Date is required"),
        name: z.string().trim().min(1, "Transaction name is required"),
        amount: z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val) && val > 0, "Amount must be a positive number"),
        type: z.enum(['Income', 'Expense']),
        tags: z.string().nullable().optional().transform(val => val ? val.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []),
    }),
    handler: async (input, context) => {
        try {
            const user = context.locals.user;
            if (!user) {
                return { ok: false, error: "Authentication required" };
            }

            // Get user with family info
            const userWithFamily = await prisma.user.findUnique({
                where: { id: user.id },
                include: { family: true }
            });

            if (!userWithFamily?.familyId) {
                return { ok: false, error: "User must belong to a family to update transactions" };
            }

            // Get existing transaction with old values for balance calculation
            const existingTransaction = await prisma.transaction.findFirst({
                where: {
                    id: input.id,
                    deletedAt: null,
                    account: {
                        familyId: userWithFamily.familyId,
                        deletedAt: null
                    }
                }
            });

            if (!existingTransaction) {
                return { ok: false, error: "Transaction not found or not accessible" };
            }

            // Verify new account belongs to user's family
            const account = await prisma.account.findFirst({
                where: {
                    id: input.accountId,
                    familyId: userWithFamily.familyId,
                    deletedAt: null
                }
            });

            if (!account) {
                return { ok: false, error: "Account not found or not accessible" };
            }

            let categoryId = input.categoryId;

            // Update transaction
            const transaction = await prisma.transaction.update({
                where: { id: input.id },
                data: {
                    accountId: input.accountId,
                    categoryId,
                    date: formatDate(input.date, { dateStyle: 'db' }),
                    name: input.name,
                    amount: input.amount,
                    type: input.type,
                    updatedAt: getCurrentDateTime(),
                    tags: {
                        set: [] // Clear existing tags first
                    }
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

            // Update account balances
            // First, reverse the old transaction's effect
            const oldBalanceChange = existingTransaction.type === 'Income' ? -existingTransaction.amount : existingTransaction.amount;

            // If account changed, update both accounts
            if (existingTransaction.accountId !== input.accountId) {
                // Update old account
                await prisma.account.update({
                    where: { id: existingTransaction.accountId },
                    data: {
                        balance: {
                            increment: oldBalanceChange
                        }
                    }
                });
            }

            // Apply new transaction's effect
            const newBalanceChange = input.type === 'Income' ? input.amount : -input.amount;
            const netChange = existingTransaction.accountId === input.accountId ?
                oldBalanceChange + newBalanceChange : newBalanceChange;

            await prisma.account.update({
                where: { id: input.accountId },
                data: {
                    balance: {
                        increment: netChange
                    }
                }
            });

            return { ok: true, transaction };

        } catch (error) {
            console.error("Error updating transaction:", error);
            return { ok: false, error: "Failed to update transaction" };
        }
    }
});

export { updateTransaction };