import { z } from 'zod';
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { nanoid } from 'nanoid';
import {
  getMailboxesByUser,
  getMailboxById,
  createMailbox,
  deleteMailbox,
  updateMailbox,
  getSwipesByUser,
  getSwipeById,
  updateSwipe,
  deleteSwipe,
  getSwipeTags,
  getTags,
  getTagsByCategory,
  getCollectionsByUser,
  createCollection,
  addSwipeToCollection,
  removeSwipeFromCollection,
} from './db';
import { 
  getAuthUrl, 
  exchangeCodeForTokens, 
  getGmailClient, 
  getUserEmail,
  setupWatch,
  stopWatch,
  listMessages,
  getMessage,
} from './services/gmail';
import { encrypt } from './utils/encryption';
import { emailQueue, aiQueue } from './jobs/queue';
import { parseGmailMessage } from './utils/emailParser';
import { searchSimilar } from './services/qdrant';
import { generateEmbedding } from './services/ai';

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Mailbox management
  mailboxes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getMailboxesByUser(ctx.user.id);
    }),

    getAuthUrl: protectedProcedure.query(() => {
      return { url: getAuthUrl() };
    }),

    connect: protectedProcedure
      .input(z.object({
        code: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Exchange code for tokens
        const { accessToken, refreshToken, expiryDate } = await exchangeCodeForTokens(input.code);

        // Get Gmail client
        const gmail = await getGmailClient(encrypt(accessToken), encrypt(refreshToken));

        // Get user's email address
        const emailAddress = await getUserEmail(gmail);

        // Setup watch for push notifications
        const { historyId, expiration } = await setupWatch(gmail);

        // Create mailbox record
        const mailbox = await createMailbox({
          id: nanoid(),
          userId: ctx.user.id,
          emailAddress,
          oauthRefreshToken: encrypt(refreshToken),
          oauthAccessToken: encrypt(accessToken),
          tokenExpiresAt: new Date(expiryDate),
          gmailHistoryId: historyId,
          watchExpiresAt: new Date(expiration),
          isActive: true,
          lastSyncAt: new Date(),
        });

        // Queue initial sync job
        await emailQueue.add('initial-sync', {
          mailboxId: mailbox.id,
          userId: ctx.user.id,
        });

        return mailbox;
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const mailbox = await getMailboxById(input.id);
        
        if (!mailbox || mailbox.userId !== ctx.user.id) {
          throw new Error('Mailbox not found');
        }

        // Stop Gmail watch
        try {
          if (mailbox.oauthAccessToken && mailbox.oauthRefreshToken) {
            const gmail = await getGmailClient(mailbox.oauthAccessToken, mailbox.oauthRefreshToken);
            await stopWatch(gmail);
          }
        } catch (error) {
          console.error('Error stopping watch:', error);
        }

        await deleteMailbox(input.id);
        return { success: true };
      }),

    sync: protectedProcedure
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const mailbox = await getMailboxById(input.id);
        
        if (!mailbox || mailbox.userId !== ctx.user.id) {
          throw new Error('Mailbox not found');
        }

        // Queue sync job
        await emailQueue.add('manual-sync', {
          mailboxId: mailbox.id,
          userId: ctx.user.id,
        });

        return { success: true };
      }),
  }),

  // Email swipes
  swipes: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ ctx, input }) => {
        const swipes = await getSwipesByUser(ctx.user.id, input.limit, input.offset);
        
        // Parse JSON fields
        return swipes.map(swipe => ({
          ...swipe,
          aiClassification: swipe.aiClassification ? JSON.parse(swipe.aiClassification) : null,
          aiInsights: swipe.aiInsights ? JSON.parse(swipe.aiInsights) : null,
          manualTags: swipe.manualTags ? JSON.parse(swipe.manualTags) : [],
        }));
      }),

    get: protectedProcedure
      .input(z.object({
        id: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const swipe = await getSwipeById(input.id);
        
        if (!swipe || swipe.userId !== ctx.user.id) {
          throw new Error('Swipe not found');
        }

        // Get tags
        const tags = await getSwipeTags(input.id);

        return {
          ...swipe,
          aiClassification: swipe.aiClassification ? JSON.parse(swipe.aiClassification) : null,
          aiInsights: swipe.aiInsights ? JSON.parse(swipe.aiInsights) : null,
          manualTags: swipe.manualTags ? JSON.parse(swipe.manualTags) : [],
          tags,
        };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        notes: z.string().optional(),
        manualTags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const swipe = await getSwipeById(input.id);
        
        if (!swipe || swipe.userId !== ctx.user.id) {
          throw new Error('Swipe not found');
        }

        await updateSwipe(input.id, {
          notes: input.notes,
          manualTags: input.manualTags ? JSON.stringify(input.manualTags) : undefined,
          updatedAt: new Date(),
        });

        return { success: true };
      }),

    toggleFavorite: protectedProcedure
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const swipe = await getSwipeById(input.id);
        
        if (!swipe || swipe.userId !== ctx.user.id) {
          throw new Error('Swipe not found');
        }

        await updateSwipe(input.id, {
          isFavorite: !swipe.isFavorite,
          updatedAt: new Date(),
        });

        return { success: true, isFavorite: !swipe.isFavorite };
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const swipe = await getSwipeById(input.id);
        
        if (!swipe || swipe.userId !== ctx.user.id) {
          throw new Error('Swipe not found');
        }

        await deleteSwipe(input.id);
        return { success: true };
      }),

    findSimilar: protectedProcedure
      .input(z.object({
        id: z.string(),
        limit: z.number().optional().default(10),
      }))
      .query(async ({ ctx, input }) => {
        const swipe = await getSwipeById(input.id);
        
        if (!swipe || swipe.userId !== ctx.user.id) {
          throw new Error('Swipe not found');
        }

        // Generate embedding for the swipe
        const text = `${swipe.subject}\n\n${swipe.plainBody}`;
        const embedding = await generateEmbedding(text);

        // Search for similar swipes
        const similar = await searchSimilar(embedding, ctx.user.id, input.limit);

        // Fetch full swipe details
        const similarSwipes = await Promise.all(
          similar
            .filter(s => s.payload.swipeId !== input.id) // Exclude self
            .map(async s => {
              const fullSwipe = await getSwipeById(s.payload.swipeId);
              return {
                ...fullSwipe,
                similarityScore: s.score,
              };
            })
        );

        return similarSwipes.filter(Boolean);
      }),
  }),

  // Tags
  tags: router({
    list: protectedProcedure.query(async () => {
      return getTags();
    }),

    byCategory: protectedProcedure
      .input(z.object({
        category: z.string(),
      }))
      .query(async ({ input }) => {
        return getTagsByCategory(input.category);
      }),
  }),

  // Collections
  collections: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getCollectionsByUser(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createCollection({
          id: nanoid(),
          userId: ctx.user.id,
          name: input.name,
          description: input.description || null,
          isPublic: false,
        });
      }),

    addSwipe: protectedProcedure
      .input(z.object({
        collectionId: z.string(),
        swipeId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify swipe belongs to user
        const swipe = await getSwipeById(input.swipeId);
        if (!swipe || swipe.userId !== ctx.user.id) {
          throw new Error('Swipe not found');
        }

        await addSwipeToCollection({
          collectionId: input.collectionId,
          swipeId: input.swipeId,
        });

        return { success: true };
      }),

    removeSwipe: protectedProcedure
      .input(z.object({
        collectionId: z.string(),
        swipeId: z.string(),
      }))
      .mutation(async ({ input }) => {
        await removeSwipeFromCollection(input.collectionId, input.swipeId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

