import { defineAction } from "astro:actions";
import { z } from 'astro:schema';
import { prisma } from '@prisma/index.js';
import { getCurrentDateTime } from '@lib/date-utils.ts';

const restoreRecurringTransaction = defineAction({
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

            const existing = await prisma.recurringTransaction.findFirst({
                where: {
                    id: input.id,
                    deletedAt: { not: null },
                    account: { familyId: userWithFamily.familyId }
                }
            });

            if (!existing) return { ok: false, error: 'Deleted recurring transaction not found.' };

            await prisma.recurringTransaction.update({ where: { id: input.id }, data: { deletedAt: null, updatedAt: getCurrentDateTime() } });

            return { ok: true };
        } catch (error) {
            console.error('Error restoring recurring transaction:', error);
            return { ok: false, error: 'Failed to restore recurring transaction.' };
        }
    }
});

export { restoreRecurringTransaction };
