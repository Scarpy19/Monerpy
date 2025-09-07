import { defineAction } from "astro:actions";
import { z } from 'astro:schema';
import { prisma } from '@prisma/index.js';
import { getCurrentDateTime, formatDate } from '@lib/date-utils.ts';
import type { Tag } from '@types.d.ts';

// Generate transactions from recurring rules
const generateRecurringTransactions = defineAction({
    accept: 'form',
    input: z.object({
        recurringTransactionIds: z.string().transform(val =>
            val.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        ),
        generateUpTo: z.string().optional().default('today') // 'today', 'nextWeek', 'nextMonth'
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

            let generatedCount = 0;
            const errors = [];

            for (const recurringTransactionId of input.recurringTransactionIds) {
                try {
                    // Get the recurring transaction
                    const recurringTransaction = await prisma.recurringTransaction.findFirst({
                        where: {
                            id: recurringTransactionId,
                            deletedAt: null,
                            account: {
                                familyId: userWithFamily.familyId,
                                deletedAt: null
                            }
                        },
                        include: {
                            tags: true
                        }
                    });

                    if (!recurringTransaction) {
                        errors.push(`Recurring transaction ${recurringTransactionId} not found`);
                        continue;
                    }

                    // Calculate the target date based on generateUpTo
                    const now = new Date();
                    let targetDate: Date;

                    switch (input.generateUpTo) {
                        case 'nextWeek':
                            targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                            break;
                        case 'nextMonth':
                            targetDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
                            break;
                        default: // 'today'
                            targetDate = now;
                    }

                    // Generate transactions up to the target date
                    const startDate = new Date(recurringTransaction.startDate);
                    let currentDate = new Date(startDate);
                    const endDate = recurringTransaction.endDate ? new Date(recurringTransaction.endDate) : null;

                    // Skip if recurring transaction hasn't started yet
                    if (startDate > now) {
                        continue;
                    }

                    while (currentDate <= targetDate) {
                        // Check if we've reached the end date
                        if (endDate && currentDate > endDate) {
                            break;
                        }

                        // Check if we've reached max occurrences
                        if (recurringTransaction.maxOccurrences &&
                            recurringTransaction.occurrencesCount >= recurringTransaction.maxOccurrences) {
                            break;
                        }

                        // Check if this transaction was already generated
                        const existingLog = await prisma.recurringTransactionLog.findFirst({
                            where: {
                                recurringTransactionId: recurringTransaction.id,
                                executionTime: formatDate(currentDate.toISOString(), { dateStyle: 'db' })
                            }
                        });

                        if (!existingLog) {
                            // Create the transaction
                            const transaction = await prisma.transaction.create({
                                data: {
                                    accountId: recurringTransaction.accountId,
                                    userId: recurringTransaction.userId,
                                    categoryId: recurringTransaction.categoryId,
                                    date: formatDate(currentDate.toISOString(), { dateStyle: 'db' }),
                                    name: `${recurringTransaction.description} (Recurring)`,
                                    amount: recurringTransaction.amount,
                                    type: recurringTransaction.type,
                                    createdAt: getCurrentDateTime(),
                                    updatedAt: getCurrentDateTime()
                                }
                            });

                            // Connect tags if any
                            if (recurringTransaction.tags.length > 0) {
                                await prisma.transaction.update({
                                    where: { id: transaction.id },
                                    data: {
                                        tags: {
                                            connect: recurringTransaction.tags.map((tag: Tag) => ({ id: tag.id }))
                                        }
                                    }
                                });
                            }

                            // Update account balance
                            const balanceChange = recurringTransaction.type === 'Income' ?
                                recurringTransaction.amount : -recurringTransaction.amount;

                            await prisma.account.update({
                                where: { id: recurringTransaction.accountId },
                                data: {
                                    balance: {
                                        increment: balanceChange
                                    }
                                }
                            });

                            // Create log entry
                            await prisma.recurringTransactionLog.create({
                                data: {
                                    recurringTransactionId: recurringTransaction.id,
                                    generatedTransactionId: transaction.id,
                                    executionTime: formatDate(currentDate.toISOString(), { dateStyle: 'db' }),
                                    createdAt: getCurrentDateTime(),
                                    updatedAt: getCurrentDateTime()
                                }
                            });

                            // Update occurrence count
                            await prisma.recurringTransaction.update({
                                where: { id: recurringTransaction.id },
                                data: {
                                    occurrencesCount: {
                                        increment: 1
                                    },
                                    updatedAt: getCurrentDateTime()
                                }
                            });

                            generatedCount++;
                        }

                        // Calculate next occurrence date based on frequency
                        switch (recurringTransaction.frequency) {
                            case 'Daily':
                                currentDate.setDate(currentDate.getDate() + 1);
                                break;
                            case 'Weekly':
                                currentDate.setDate(currentDate.getDate() + 7);
                                break;
                            case 'Monthly':
                                currentDate.setMonth(currentDate.getMonth() + 1);
                                break;
                            case 'Yearly':
                                currentDate.setFullYear(currentDate.getFullYear() + 1);
                                break;
                        }
                    }

                } catch (error) {
                    console.error(`Error generating transactions for recurring transaction ${recurringTransactionId}:`, error);
                    errors.push(`Failed to generate transactions for recurring transaction ${recurringTransactionId}`);
                }
            }

            return {
                ok: true,
                generated: generatedCount,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (error) {
            console.error("Error generating recurring transactions:", error);
            return { ok: false, error: "Failed to generate recurring transactions" };
        }
    }
});

export { generateRecurringTransactions };