# SAGE - Chat App with a GROQ-based Graph RAG

SAGE is a chat application connected to a backend GROQ-based Graph RAG,
helping to create and use an Enterprise Knowledge Graph (EKG) using n8n and Neo4j.

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- A running instance of the FastAPI backend

### Installation

```bash
# Clone the repository
git clone https://github.com/gamidirohan/ChatAppSAGE.git
cd ChatAppSAGE

# Install dependencies
npm install
```

### Running the Development Server

```bash
# Start the Next.js development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Running the Webhook Server

To enable real-time updates from the backend, run the webhook server in a separate terminal:

```bash
# Start the webhook server
npx ngrok http 3000
```

This will create a public URL that can be used to receive webhook events from the backend. Copy the HTTPS URL provided by ngrok and configure it in your backend system.

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000  # URL of your FastAPI backend
```

### Backend Integration

The application communicates with a FastAPI backend that provides:

1. **Chat API** - `/api/chat` endpoint for AI-powered conversations
2. **Document Processing** - `/api/process_document` endpoint for document analysis
3. **Graph Debugging** - `/api/debug_graph` endpoint for inspecting the knowledge graph
4. **Health Checks** - `/api/health` endpoint for monitoring backend status


## Features

- **User Authentication** - Simple login/register system
- **Real-time Chat** - WebSocket-based messaging between users
- **AI Assistant (SAGE)** - Intelligent chat with the SAGE AI assistant
- **Document Upload** - Support for PDF and TXT document uploads
- **Knowledge Graph** - Backend integration with a graph-based RAG system
- **Dark Mode** - Toggle between light and dark themes
- **Responsive Design** - Works on desktop and mobile devices

## File Structure

```
├── public/               # Static files
│   ├── logo.svg          # SAGE logo
│   └── uploads/          # Uploaded documents
├── src/
│   ├── app/              # Next.js app router
│   │   ├── api/          # API routes
│   │   │   ├── chat/     # AI chat endpoint
│   │   │   ├── health/   # Health check endpoint
│   │   │   ├── messages/ # Message handling
│   │   │   ├── process-document/ # Document processing
│   │   │   ├── upload/   # File upload handling
│   │   │   └── webhook/  # Webhook for real-time updates
│   │   ├── chat/         # Chat page
│   │   ├── components/   # App-specific components
│   │   ├── debug/        # Graph debugging page
│   │   ├── login/        # Authentication pages
│   │   ├── upload/       # Document upload page
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/       # Shared components
│   │   ├── ui/           # UI components (shadcn/ui)
│   │   └── Navbar.tsx    # Navigation bar
│   ├── context/          # React context providers
│   │   ├── AuthContext.tsx # Authentication context
│   │   └── ThemeContext.tsx # Theme context
│   ├── data/             # Static data
│   │   ├── messages.json  # Sample messages
│   │   └── users.json     # User data
│   ├── lib/              # Utility functions
│   │   ├── api.ts        # API client
│   │   ├── messageProcessor.ts # Message processing
│   │   ├── userData.ts   # User data handling
│   │   └── websocket.ts  # WebSocket client
│   └── types/            # TypeScript type definitions
└── tailwind.config.ts    # Tailwind CSS configuration
```
