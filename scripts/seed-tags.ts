import { nanoid } from 'nanoid';
import { getDb } from '../server/db';
import { tags } from '../drizzle/schema';

const tagData = [
  // Use Cases
  { category: 'use_case', name: 'Welcome/Onboarding', description: 'New user welcome emails' },
  { category: 'use_case', name: 'Promotional/Sales', description: 'Discount and sales promotions' },
  { category: 'use_case', name: 'Abandoned Cart', description: 'Cart abandonment recovery' },
  { category: 'use_case', name: 'Win-back/Re-engagement', description: 'Inactive user re-engagement' },
  { category: 'use_case', name: 'Newsletter/Content', description: 'Regular newsletter content' },
  { category: 'use_case', name: 'Product Launch', description: 'New product announcements' },
  { category: 'use_case', name: 'Referral', description: 'Referral program emails' },
  { category: 'use_case', name: 'Transactional', description: 'Order confirmations, receipts' },
  { category: 'use_case', name: 'Event/Webinar', description: 'Event invitations and reminders' },
  { category: 'use_case', name: 'Survey/Feedback', description: 'Customer feedback requests' },

  // Niches
  { category: 'niche', name: 'SaaS/Technology', description: 'Software and tech products' },
  { category: 'niche', name: 'E-commerce/Retail', description: 'Online retail and shopping' },
  { category: 'niche', name: 'Finance/Fintech', description: 'Financial services and products' },
  { category: 'niche', name: 'Health/Wellness', description: 'Health and fitness products' },
  { category: 'niche', name: 'Education/EdTech', description: 'Educational products and courses' },
  { category: 'niche', name: 'B2B Services', description: 'Business-to-business services' },
  { category: 'niche', name: 'Consumer Apps', description: 'Consumer mobile and web apps' },
  { category: 'niche', name: 'Real Estate', description: 'Property and real estate' },
  { category: 'niche', name: 'Media/Publishing', description: 'Content and media companies' },
  { category: 'niche', name: 'Non-profit', description: 'Charitable organizations' },

  // Copywriting Techniques
  { category: 'technique', name: 'Urgency/Scarcity', description: 'Limited time or quantity offers' },
  { category: 'technique', name: 'Social Proof', description: 'Testimonials and user numbers' },
  { category: 'technique', name: 'Storytelling', description: 'Narrative-driven content' },
  { category: 'technique', name: 'Personalization', description: 'Customized to recipient' },
  { category: 'technique', name: 'Problem/Solution', description: 'Addresses pain points' },
  { category: 'technique', name: 'Before/After', description: 'Transformation stories' },
  { category: 'technique', name: 'Question Hook', description: 'Opens with engaging question' },
  { category: 'technique', name: 'Curiosity Gap', description: 'Creates intrigue to click' },
  { category: 'technique', name: 'Benefit-focused', description: 'Emphasizes user benefits' },
  { category: 'technique', name: 'Feature List', description: 'Lists product features' },
  { category: 'technique', name: 'Objection Handling', description: 'Addresses common concerns' },
  { category: 'technique', name: 'Call-to-Action Focus', description: 'Strong, clear CTAs' },

  // Purpose
  { category: 'purpose', name: 'Sales/Conversion', description: 'Drive purchases or signups' },
  { category: 'purpose', name: 'Education', description: 'Inform and teach users' },
  { category: 'purpose', name: 'Engagement', description: 'Increase user interaction' },
  { category: 'purpose', name: 'Retention', description: 'Keep users active' },
  { category: 'purpose', name: 'Brand Building', description: 'Build brand awareness' },
  { category: 'purpose', name: 'Support', description: 'Customer support and help' },

  // Sender Types
  { category: 'sender_type', name: 'Startup', description: 'Early-stage companies' },
  { category: 'sender_type', name: 'Enterprise', description: 'Large corporations' },
  { category: 'sender_type', name: 'Solo Creator', description: 'Individual creators' },
  { category: 'sender_type', name: 'Agency', description: 'Marketing or service agencies' },
  { category: 'sender_type', name: 'E-commerce Brand', description: 'Online retail brands' },
  { category: 'sender_type', name: 'Newsletter', description: 'Newsletter publishers' },
  { category: 'sender_type', name: 'Marketplace', description: 'Multi-vendor platforms' },
];

async function seedTags() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  console.log('Seeding tags...');
  
  for (const tag of tagData) {
    try {
      await db.insert(tags).values({
        id: nanoid(),
        category: tag.category,
        name: tag.name,
        description: tag.description || null,
      }).onDuplicateKeyUpdate({
        set: {
          description: tag.description || null,
        }
      });
    } catch (error) {
      console.error(`Error seeding tag ${tag.name}:`, error);
    }
  }

  console.log(`✓ Seeded ${tagData.length} tags`);
  process.exit(0);
}

seedTags();

