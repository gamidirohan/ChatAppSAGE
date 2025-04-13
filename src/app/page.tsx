import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageSquare, Upload, Database } from 'lucide-react'

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto space-y-12 w-full p-4 py-8">
      {/* Hero section */}
      <section className="text-center space-y-4 py-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Graph-based RAG Chat Application
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Interact with your documents using a powerful graph-based retrieval augmented generation system
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Button asChild size="lg">
            <Link href="/chat">Start Chatting</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/upload">Upload Documents</Link>
          </Button>
        </div>
      </section>

      {/* Features section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border rounded-lg p-6 text-center space-y-4">
            <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Intelligent Chat</h3>
            <p className="text-muted-foreground">
              Ask questions about your documents and get accurate answers powered by graph-based RAG
            </p>
          </div>

          <div className="border rounded-lg p-6 text-center space-y-4">
            <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Document Processing</h3>
            <p className="text-muted-foreground">
              Upload PDF and TXT files to extract entities and build a knowledge graph
            </p>
          </div>

          <div className="border rounded-lg p-6 text-center space-y-4">
            <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Knowledge Graph</h3>
            <p className="text-muted-foreground">
              Visualize connections between entities in your documents with Neo4j integration
            </p>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="py-12 bg-muted/50 rounded-lg p-8">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <ol className="space-y-6 max-w-3xl mx-auto">
          <li className="flex gap-4">
            <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
              1
            </div>
            <div>
              <h3 className="text-xl font-semibold">Upload Documents</h3>
              <p className="text-muted-foreground">
                Start by uploading your PDF or TXT documents to the system. The backend will process them and extract entities.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
              2
            </div>
            <div>
              <h3 className="text-xl font-semibold">Graph Construction</h3>
              <p className="text-muted-foreground">
                The system automatically builds a knowledge graph in Neo4j, connecting entities and documents.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
              3
            </div>
            <div>
              <h3 className="text-xl font-semibold">Ask Questions</h3>
              <p className="text-muted-foreground">
                Use the chat interface to ask questions about your documents. The graph-based RAG system will find relevant information and generate accurate answers.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* CTA section */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-xl text-muted-foreground mb-8">
          Start chatting with your documents or upload new ones now.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/chat">Start Chatting</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/upload">Upload Documents</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
