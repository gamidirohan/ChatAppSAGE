## Chat App with a GROQ-based Graph RAG
It's a chat app which will be connected to a backend GROQ-based Graph RAG,
helping to create and use an Enterprise Knowledge Graph (EKG) using n8n and Neo4j.

## File Structure
- src/
  - app/
    - components/
      - ChatWindow.tsx
    - (Other Next.js app files)
  - components/
    - ui/
      - button.tsx
      - input.tsx
- data/
  - messages.json
  - users.json

## Detailed File Structure

- src/
  - app/
    - layout.tsx - Defines the layout for your Next.js pages
    - page.tsx - Main landing page for the app
    - components/
      - ChatWindow.tsx - Displays the current chat and handles chat logic
      - /* Other components specific to your app */
  - components/
    - ui/
      - button.tsx - Button UI component
      - input.tsx - Input UI component
      // ...other UI components...
- data/
  - messages.json - Sample message data
  - users.json - User data references
- /* Add any other important directories here */
