import { defineAction } from "astro:actions";
import { z } from 'astro:schema';
import { prisma } from '@prisma/index.js';
import { getCurrentDateTime } from '@lib/date-utils.ts';

const deleteRecurringTransaction = defineAction({
    accept: 'form',
    input: z.object({
        id: z.string().transform(val => parseInt(val)).refine(val => !isNaN(val), "ID is required")
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
                return { ok: false, error: "User must belong to a family to delete recurring transactions" };
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

            // Soft delete the recurring transaction
            await prisma.recurringTransaction.update({
                where: { id: input.id },
                data: {
                    deletedAt: getCurrentDateTime(),
                    updatedAt: getCurrentDateTime()
                }
            });

            return { ok: true };

        } catch (error) {
            console.error("Error deleting recurring transaction:", error);
            return { ok: false, error: "Failed to delete recurring transaction" };
        }
    }
});

export { deleteRecurringTransaction };