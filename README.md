# SwipeVault - Email Swipe File Manager

An intelligent web application that automatically monitors multiple Gmail mailboxes, captures email marketing examples ("swipes"), analyzes them with AI, and organizes them into a searchable, tagged database for copywriters and marketers.

## Features

### 🔗 Gmail Integration
- **Multiple Account Support**: Connect unlimited Gmail accounts via OAuth 2.0
- **Real-time Monitoring**: Automatic email capture using Gmail API push notifications
- **Smart Filtering**: Monitor specific labels (INBOX by default)
- **Auto-sync**: Background job processing for efficient email parsing

### 🤖 AI-Powered Analysis
- **Smart Classification**: Automatically tags emails by:
  - Use case (Welcome, Promotional, Abandoned Cart, etc.)
  - Industry/Niche (SaaS, E-commerce, Finance, etc.)
  - Copywriting techniques (Urgency, Social Proof, Storytelling, etc.)
  - Purpose (Sales, Education, Engagement, etc.)
  - Sender type (Startup, Enterprise, Solo Creator, etc.)
- **AI Insights**: Get detailed analysis of:
  - Email summary and key takeaways
  - Headline/subject line quality
  - Call-to-action effectiveness
  - Copywriting techniques used

### 🔍 Semantic Search
- **Vector Embeddings**: Find similar emails using AI-powered similarity search
- **Smart Discovery**: Discover related swipes based on content, not just keywords

### 📁 Organization Tools
- **Collections**: Create custom folders to organize swipes
- **Favorites**: Star important emails for quick access
- **Manual Tags**: Add your own tags and notes
- **Filtering**: Search and filter by tags, sender, date, etc.

### 🎨 Beautiful Interface
- **Modern Dashboard**: Clean, intuitive UI built with React 19 and Tailwind CSS
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark/Light Mode**: Customizable theme
- **Email Preview**: View HTML and plain text versions

## Tech Stack

### Frontend
- **React 19** with **Next.js 15**
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **TanStack Query** for data fetching
- **tRPC** for end-to-end type-safe APIs

### Backend
- **Node.js** with **Express**
- **TypeScript**
- **tRPC** for API layer
- **Drizzle ORM** for database
- **BullMQ** for job queue
- **JWT** authentication

### Infrastructure (Elestio-hosted)
- **PostgreSQL/MySQL**: Primary database
- **Redis**: Job queue and caching
- **Qdrant**: Vector database for semantic search

### External Services
- **Gmail API**: Email access and monitoring
- **Google Cloud Pub/Sub**: Real-time notifications
- **OpenAI API**: AI classification and embeddings (via Manus built-in API)

## Cost-Efficient Architecture

SwipeVault is designed to be cost-effective using open-source and affordable services:

- **Elestio**: ~$21-45/month for PostgreSQL, Redis, and Qdrant
- **Railway**: $5/month (Hobby plan) for application hosting
- **Gmail API**: Free (1 billion requests/day quota)
- **OpenAI API**: Built-in Manus API (cost-efficient gpt-4o-mini model)

**Total: ~$26-50/month** for full production deployment

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm package manager
- Gmail account
- Google Cloud Platform account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/swipevault.git
   cd swipevault
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables (see DEPLOYMENT.md)

4. Run database migrations:
   ```bash
   pnpm db:push
   ```

5. Seed tags:
   ```bash
   npx tsx scripts/seed-tags.ts
   ```

6. Start development server:
   ```bash
   pnpm dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions using Elestio and Railway.

## How It Works

1. **Connect Gmail**: User connects Gmail account via OAuth 2.0
2. **Setup Watch**: App subscribes to Gmail push notifications via Pub/Sub
3. **Receive Notifications**: Gmail sends notifications when new emails arrive
4. **Process Emails**: Background job fetches and parses email content
5. **AI Classification**: Email is analyzed and tagged by AI
6. **Generate Embeddings**: Vector embeddings created for semantic search
7. **Store & Index**: Email and metadata stored in PostgreSQL, vectors in Qdrant
8. **Search & Discover**: Users can browse, search, and find similar swipes

## Database Schema

- **users**: User accounts
- **connected_mailboxes**: Gmail accounts connected via OAuth
- **email_swipes**: Captured email swipes with AI analysis
- **tags**: Predefined taxonomy (45 tags across 5 categories)
- **swipe_tags**: Many-to-many relationship with confidence scores
- **collections**: User-created folders
- **collection_swipes**: Swipes in collections
- **job_logs**: Background job tracking

## API Endpoints

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Mailboxes
- `GET /api/mailboxes` - List connected mailboxes
- `POST /api/mailboxes/connect` - Connect Gmail account
- `DELETE /api/mailboxes/:id` - Disconnect mailbox
- `POST /api/mailboxes/:id/sync` - Manual sync

### Swipes
- `GET /api/swipes` - List swipes with pagination
- `GET /api/swipes/:id` - Get swipe details
- `PUT /api/swipes/:id` - Update notes/tags
- `POST /api/swipes/:id/favorite` - Toggle favorite
- `POST /api/swipes/:id/similar` - Find similar swipes

### Collections
- `GET /api/collections` - List collections
- `POST /api/collections` - Create collection
- `POST /api/collections/:id/swipes` - Add swipe to collection

## Security

- OAuth tokens encrypted at rest using AES-256
- JWT authentication with httpOnly cookies
- CSRF protection
- Rate limiting
- Input validation and sanitization
- SQL injection prevention (Drizzle ORM)

## Roadmap

- [ ] Browser extension for one-click saves
- [ ] Email forwarding address
- [ ] Collaborative collections
- [ ] Advanced search filters
- [ ] Export functionality
- [ ] Email trend analysis
- [ ] Competitive tracking
- [ ] Mobile apps

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [github.com/yourusername/swipevault/issues](https://github.com/yourusername/swipevault/issues)
- Documentation: [See DEPLOYMENT.md](./DEPLOYMENT.md)

## Acknowledgments

- Built with [Manus AI](https://manus.im)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)

