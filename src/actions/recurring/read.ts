import { defineAction } from "astro:actions";
import { z } from 'astro:schema';
import { prisma } from '@prisma/index.js';

const getRecurringTransactions = defineAction({
    accept: 'json',
    input: z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        accountId: z.number().optional(),
        categoryId: z.number().optional(),
        type: z.enum(['Income', 'Expense']).optional(),
        frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Yearly']).optional(),
        status: z.enum(['active', 'completed', 'paused']).optional(),
        includeDeleted: z.boolean().optional().default(false)
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
                return { ok: false, error: "User must belong to a family" };
            }

            const where: any = {
                ...(input.includeDeleted ? {} : { deletedAt: null }),
                account: {
                    familyId: userWithFamily.familyId,
                    deletedAt: null
                }
            };

            // Apply filters
            if (input.accountId) {
                where.accountId = input.accountId;
            }
            if (input.categoryId) {
                where.categoryId = input.categoryId;
            }
            if (input.type) {
                where.type = input.type;
            }
            if (input.frequency) {
                where.frequency = input.frequency;
            }

            const skip = (input.page - 1) * input.limit;

            const [recurringTransactions, total] = await Promise.all([
                prisma.recurringTransaction.findMany({
                    where,
                    include: {
                        account: {
                            select: { id: true, name: true, color: true }
                        },
                        category: {
                            select: { id: true, name: true, color: true }
                        },
                        tags: {
                            select: { id: true, name: true, color: true }
                        },
                        user: {
                            select: { id: true, username: true }
                        },
                        logs: {
                            orderBy: { executionTime: 'desc' },
                            take: 5,
                            include: {
                                generatedTransaction: {
                                    select: { id: true, name: true, amount: true, date: true }
                                }
                            }
                        }
                    },
                    orderBy: [
                        { createdAt: 'desc' }
                    ],
                    skip,
                    take: input.limit
                }),
                prisma.recurringTransaction.count({ where })
            ]);

            // Add status calculation for each recurring transaction
            const recurringTransactionsWithStatus = recurringTransactions.map(rt => {
                const now = new Date();
                const startDate = new Date(rt.startDate);
                const endDate = rt.endDate ? new Date(rt.endDate) : null;

                let status = 'active';

                // Check if completed by end date
                if (endDate && now > endDate) {
                    status = 'completed';
                }

                // Check if completed by max occurrences
                if (rt.maxOccurrences && rt.occurrencesCount >= rt.maxOccurrences) {
                    status = 'completed';
                }

                // Check if not started yet
                if (now < startDate) {
                    status = 'scheduled';
                }

                return {
                    ...rt,
                    status,
                    remainingOccurrences: rt.maxOccurrences ? Math.max(0, rt.maxOccurrences - rt.occurrencesCount) : null
                };
            });

            return {
                ok: true,
                recurringTransactions: recurringTransactionsWithStatus,
                pagination: {
                    total,
                    page: input.page,
                    limit: input.limit,
                    totalPages: Math.ceil(total / input.limit)
                }
            };

        } catch (error) {
            console.error("Error fetching recurring transactions:", error);
            return { ok: false, error: "Failed to fetch recurring transactions" };
        }
    }
});

const getRecurringTransaction = defineAction({
    accept: 'json',
    input: z.object({
        id: z.number()
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
                return { ok: false, error: "User must belong to a family" };
            }

            const recurringTransaction = await prisma.recurringTransaction.findFirst({
                where: {
                    id: input.id,
                    deletedAt: null,
                    account: {
                        familyId: userWithFamily.familyId,
                        deletedAt: null
                    }
                },
                include: {
                    account: {
                        select: { id: true, name: true, color: true }
                    },
                    category: {
                        select: { id: true, name: true, color: true }
                    },
                    tags: {
                        select: { id: true, name: true, color: true }
                    },
                    user: {
                        select: { id: true, username: true }
                    },
                    logs: {
                        orderBy: { executionTime: 'desc' },
                        include: {
                            generatedTransaction: {
                                select: { id: true, name: true, amount: true, date: true, type: true }
                            }
                        }
                    }
                }
            });

            if (!recurringTransaction) {
                return { ok: false, error: "Recurring transaction not found" };
            }

            // Calculate status
            const now = new Date();
            const startDate = new Date(recurringTransaction.startDate);
            const endDate = recurringTransaction.endDate ? new Date(recurringTransaction.endDate) : null;

            let status = 'active';

            if (endDate && now > endDate) {
                status = 'completed';
            }

            if (recurringTransaction.maxOccurrences && recurringTransaction.occurrencesCount >= recurringTransaction.maxOccurrences) {
                status = 'completed';
            }

            if (now < startDate) {
                status = 'scheduled';
            }

            return {
                ok: true,
                recurringTransaction: {
                    ...recurringTransaction,
                    status,
                    remainingOccurrences: recurringTransaction.maxOccurrences ? Math.max(0, recurringTransaction.maxOccurrences - recurringTransaction.occurrencesCount) : null
                }
            };

        } catch (error) {
            console.error("Error fetching recurring transaction:", error);
            return { ok: false, error: "Failed to fetch recurring transaction" };
        }
    }
});

export { getRecurringTransactions, getRecurringTransaction };