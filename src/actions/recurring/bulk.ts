import { defineAction } from "astro:actions";
import { z } from 'astro:schema';
import { prisma } from '@prisma/index.js';
import { getCurrentDateTime } from '@lib/date-utils.ts';

function parseIds(raw: string): number[] {
    if (!raw) return [];
    return Array.from(new Set(
        raw.split(/[,\s]+/)
            .map(v => v.trim())
            .filter(v => v.length > 0)
            .map(v => parseInt(v, 10))
            .filter(n => Number.isFinite(n) && n > 0)
    ));
}

const MAX_BULK = 10;

const bulkRestoreRecurring = defineAction({
    accept: 'form',
    input: z.object({ ids: z.string().trim().min(1) }),
    handler: async (input, context) => {
        try {
            const user = context.locals.user;
            if (!user) return { ok: false, error: 'Authentication required.' };

            const userWithFamily = await prisma.user.findUnique({ where: { id: user.id }, include: { family: true } });
            if (!userWithFamily?.familyId) return { ok: false, error: 'User must belong to a family.' };

            const ids = parseIds(input.ids).slice(0, MAX_BULK);
            if (ids.length === 0) return { ok: false, error: 'No valid ids provided.' };

            const candidates = await prisma.recurringTransaction.findMany({ where: { id: { in: ids }, account: { familyId: userWithFamily.familyId } }, select: { id: true, deletedAt: true } });
            const existingMap = new Map(candidates.map(c => [c.id, c]));

            const valid: number[] = [];
            const skipped: any[] = [];

            for (const id of ids) {
                const c = existingMap.get(id);
                if (!c) { skipped.push({ id, reason: 'not_found' }); continue; }
                if (!c.deletedAt) { skipped.push({ id, reason: 'not_deleted_anymore' }); continue; }
                valid.push(id);
            }

            if (valid.length === 0) return { ok: true, restored: 0, skipped };

            await prisma.$transaction(async (tx) => {
                for (const id of valid) {
                    await tx.recurringTransaction.update({ where: { id }, data: { deletedAt: null, updatedAt: getCurrentDateTime() } });
                }
            });

            return { ok: true, restored: valid.length, skipped };
        } catch (error) {
            console.error('Error bulk restoring recurring transactions:', error);
            return { ok: false, error: 'Failed to bulk restore recurring transactions.' };
        }
    }
});

const bulkPurgeRecurring = defineAction({
    accept: 'form',
    input: z.object({ ids: z.string().trim().min(1) }),
    handler: async (input, context) => {
        try {
            const user = context.locals.user;
            if (!user) return { ok: false, error: 'Authentication required.' };

            const userWithFamily = await prisma.user.findUnique({ where: { id: user.id }, include: { family: true } });
            if (!userWithFamily?.familyId) return { ok: false, error: 'User must belong to a family.' };

            const ids = parseIds(input.ids).slice(0, MAX_BULK);
            if (ids.length === 0) return { ok: false, error: 'No valid ids provided.' };

            const candidates = await prisma.recurringTransaction.findMany({ where: { id: { in: ids }, account: { familyId: userWithFamily.familyId } }, select: { id: true, deletedAt: true } });
            const existingMap = new Map(candidates.map(c => [c.id, c]));

            const valid: number[] = [];
            const skipped: any[] = [];

            for (const id of ids) {
                const c = existingMap.get(id);
                if (!c) { skipped.push({ id, reason: 'not_found' }); continue; }
                if (!c.deletedAt) { skipped.push({ id, reason: 'not_deleted_anymore' }); continue; }
                valid.push(id);
            }

            if (valid.length === 0) return { ok: true, purged: 0, skipped };

            await prisma.$transaction(async (tx) => {
                // Delete logs then delete recurring rules
                await tx.recurringTransactionLog.deleteMany({ where: { recurringTransactionId: { in: valid } } });
                await tx.recurringTransaction.deleteMany({ where: { id: { in: valid } } });
            });

            return { ok: true, purged: valid.length, skipped };
        } catch (error) {
            console.error('Error bulk purging recurring transactions:', error);
            return { ok: false, error: 'Failed to bulk purge recurring transactions.' };
        }
    }
});

export { bulkRestoreRecurring, bulkPurgeRecurring };
