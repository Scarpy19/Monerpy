import { defineAction } from "astro:actions";
import { z } from 'astro:schema';
import { prisma } from '@prisma/index.js';
import { formatDate, getCurrentDateTime } from '@lib/date-utils.ts';

const updateRecurringTransaction = defineAction({
    accept: 'form',
    input: z.object({
        id: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val), "ID is required"),
        accountId: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val), "Account is required"),
        categoryId: z.string().nullable().transform(val => val && val !== '' ? parseInt(val) : undefined),
        description: z.string().trim().min(1, "Description is required"),
        amount: z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val) && val > 0, "Amount must be a positive number"),
        type: z.enum(['Income', 'Expense']),
        frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Yearly']),
        dayOfMonth: z.string().nullable().optional().transform(val => val && val !== '' ? parseInt(val) : undefined),
        dayOfWeek: z.string().nullable().optional().transform(val => val && val !== '' ? parseInt(val) : undefined),
        timeOfDay: z.string().min(1, "Time of day is required"),
        startDate: z.string().min(1, "Start date is required"),
        endCondition: z.enum(['never', 'endDate', 'maxOccurrences']),
        endDate: z.string().nullable().optional(),
        maxOccurrences: z.string().nullable().optional().transform(val => val && val !== '' ? parseInt(val) : undefined),
        tags: z.string().nullable().optional().transform(val => val ? val.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []),
        newCategory: z.string().nullable().optional().transform(val => val?.trim() || undefined),
        newCategoryColor: z.string().optional().default("#6172f3")
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
                return { ok: false, error: "User must belong to a family to update recurring transactions" };
            }

            // Verify recurring transaction exists and belongs to user's family
            const existingRecurringTransaction = await prisma.recurringTransaction.findFirst({
                where: {
                    id: input.id,
                    deletedAt: null,
                    account: {
                        familyId: userWithFamily.familyId,
                        deletedAt: null
                    }
                }
            });

            if (!existingRecurringTransaction) {
                return { ok: false, error: "Recurring transaction not found or not accessible" };
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
                return { ok: false, error: "Account not found or not accessible" };
            }

            // Validate frequency-specific fields
            if (input.frequency === 'Weekly' && (input.dayOfWeek === undefined || input.dayOfWeek < 0 || input.dayOfWeek > 6)) {
                return { ok: false, error: "Day of week is required for weekly frequency (0-6)" };
            }

            if (input.frequency === 'Monthly' && (input.dayOfMonth === undefined || input.dayOfMonth < 1 || input.dayOfMonth > 31)) {
                return { ok: false, error: "Day of month is required for monthly frequency (1-31)" };
            }

            if (input.frequency === 'Yearly' && (input.dayOfMonth === undefined || input.dayOfMonth < 1 || input.dayOfMonth > 31)) {
                return { ok: false, error: "Day of month is required for yearly frequency (1-31)" };
            }

            // Validate end condition
            let endDate = null;
            let maxOccurrences = null;

            if (input.endCondition === 'endDate') {
                if (!input.endDate) {
                    return { ok: false, error: "End date is required when end condition is set to end by date" };
                }
                endDate = formatDate(input.endDate, { dateStyle: 'db', includeTime: false });
            } else if (input.endCondition === 'maxOccurrences') {
                if (!input.maxOccurrences || input.maxOccurrences <= 0) {
                    return { ok: false, error: "Max occurrences must be a positive number" };
                }
                maxOccurrences = input.maxOccurrences;
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

            // Update recurring transaction
            const recurringTransaction = await prisma.recurringTransaction.update({
                where: { id: input.id },
                data: {
                    accountId: input.accountId,
                    categoryId,
                    description: input.description,
                    amount: input.amount,
                    type: input.type,
                    frequency: input.frequency,
                    dayOfMonth: input.dayOfMonth,
                    dayOfWeek: input.dayOfWeek,
                    timeOfDay: input.timeOfDay,
                    startDate: formatDate(input.startDate, { dateStyle: 'db', includeTime: false }),
                    endDate,
                    maxOccurrences,
                    updatedAt: getCurrentDateTime()
                }
            });

            // Handle tags - first remove all existing tags, then add new ones
            await prisma.recurringTransaction.update({
                where: { id: input.id },
                data: {
                    tags: {
                        set: []
                    }
                }
            });

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

                await prisma.recurringTransaction.update({
                    where: { id: input.id },
                    data: {
                        tags: {
                            connect: tagConnections
                        }
                    }
                });
            }

            return { ok: true, recurringTransaction };

        } catch (error) {
            console.error("Error updating recurring transaction:", error);
            return { ok: false, error: "Failed to update recurring transaction" };
        }
    }
});

export { updateRecurringTransaction };