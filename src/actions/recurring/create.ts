import { defineAction } from "astro:actions";
import { z } from 'astro:schema';
import { prisma } from '@prisma/index.js';
import { formatDate, getCurrentDateTime } from '@lib/date-utils.ts';

const createRecurringTransaction = defineAction({
    accept: 'form',
    input: z.object({
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
    }),
    handler: async (input, context) => {
        try {
            const user = context.locals.user;
            console.log(input);

            if (!user) {
                return { ok: false, error: "Authentication required" };
            }

            // Get user with family info
            const userWithFamily = await prisma.user.findUnique({
                where: { id: user.id },
                include: { family: true }
            });

            if (!userWithFamily?.familyId) {
                return { ok: false, error: "User must belong to a family to create recurring transactions" };
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
                endDate = formatDate(input.endDate, {
                    dateStyle: 'db',
                    includeTime: false,
                });
            } else if (input.endCondition === 'maxOccurrences') {
                if (!input.maxOccurrences || input.maxOccurrences <= 0) {
                    return { ok: false, error: "Max occurrences must be a positive number" };
                }
                maxOccurrences = input.maxOccurrences;
            }

            // Create recurring transaction
            const recurringTransaction = await prisma.recurringTransaction.create({
                data: {
                    accountId: input.accountId,
                    userId: user.id,
                    categoryId: input.categoryId,
                    description: input.description,
                    amount: input.amount,
                    type: input.type,
                    frequency: input.frequency,
                    dayOfMonth: input.dayOfMonth,
                    dayOfWeek: input.dayOfWeek,
                    timeOfDay: input.timeOfDay,
                    startDate: formatDate(input.startDate, {
                        dateStyle: 'db',
                        includeTime: false,
                    }),
                    endDate,
                    maxOccurrences,
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

                await prisma.recurringTransaction.update({
                    where: { id: recurringTransaction.id },
                    data: {
                        tags: {
                            connect: tagConnections
                        }
                    }
                });
            }

            return { ok: true, recurringTransaction };

        } catch (error) {
            console.error("Error creating recurring transaction:", error);
            return { ok: false, error: "Failed to create recurring transaction" };
        }
    }
});

export { createRecurringTransaction };