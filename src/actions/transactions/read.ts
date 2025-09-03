import { defineAction } from "astro:actions";
import { z } from 'astro:schema';
import { prisma } from '@prisma/index.js';
import type { Transaction, GetTransactionsResult } from "@types.d.ts";

const getTransactions = defineAction({
    accept: 'json',
    input: z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        accountId: z.number().optional(),
        categoryId: z.number().optional(),
        type: z.enum(['Income', 'Expense']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional()
    }),
    handler: async (input, context): Promise<GetTransactionsResult> => {
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
                deletedAt: null,
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
            if (input.startDate) {
                where.date = { ...where.date, gte: input.startDate };
            }
            if (input.endDate) {
                where.date = { ...where.date, lte: input.endDate };
            }

            const skip = (input.page - 1) * input.limit;

            const [transactions, total] = await Promise.all([
                prisma.transaction.findMany({
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
                        }
                    },
                    orderBy: [
                        { date: 'desc' },
                        { createdAt: 'desc' }
                    ],
                    skip,
                    take: input.limit
                }),
                prisma.transaction.count({ where })
            ]);

            return {
                ok: true,
                transactions: transactions as unknown as Transaction[],
                pagination: {
                    total,
                    page: input.page,
                    limit: input.limit,
                    totalPages: Math.ceil(total / input.limit)
                }
            };

        } catch (error) {
            console.error("Error fetching transactions:", error);
            return { ok: false, error: "Failed to fetch transactions" };
        }
    }
});

const getTransaction = defineAction({
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

            const transaction = await prisma.transaction.findFirst({
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
                    }
                }
            });

            if (!transaction) {
                return { ok: false, error: "Transaction not found" };
            }

            return { ok: true, transaction };

        } catch (error) {
            console.error("Error fetching transaction:", error);
            return { ok: false, error: "Failed to fetch transaction" };
        }
    }
});

export { getTransactions, getTransaction };