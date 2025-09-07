import { defineAction } from "astro:actions";
import { z } from 'astro:schema';
import { prisma } from '@prisma/index.js';

const purgeRecurringTransaction = defineAction({
    accept: 'form',
    input: z.object({
        id: z.string().transform(val => parseInt(val))
    }),
    handler: async (input, context) => {
        try {
            const user = context.locals.user;
            if (!user) return { ok: false, error: 'Authentication required.' };

            const userWithFamily = await prisma.user.findUnique({ where: { id: user.id }, include: { family: true } });
            if (!userWithFamily?.familyId) return { ok: false, error: 'User must belong to a family.' };

            // Find the deleted recurring transaction belonging to the family
            const existing = await prisma.recurringTransaction.findFirst({
                where: {
                    id: input.id,
                    deletedAt: { not: null },
                    account: { familyId: userWithFamily.familyId }
                }
            });

            if (!existing) return { ok: false, error: 'Deleted recurring transaction not found.' };

            await prisma.$transaction(async (tx) => {
                // Delete associated logs (leave generated transactions intact)
                await tx.recurringTransactionLog.deleteMany({ where: { recurringTransactionId: input.id } });

                // Delete the recurring transaction
                await tx.recurringTransaction.delete({ where: { id: input.id } });
            });

            return { ok: true };
        } catch (error) {
            console.error('Error purging recurring transaction:', error);
            return { ok: false, error: 'Failed to permanently delete recurring transaction.' };
        }
    }
});

export { purgeRecurringTransaction };
