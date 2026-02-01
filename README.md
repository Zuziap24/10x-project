# 10x-cards

## Project Description

10x-cards.pl is a web application designed to help users quickly create and manage educational flashcards. By leveraging Large Language Models (LLMs) via API, the application automates the process of generating high-quality questions and answers from provided text, significantly reducing the time required to prepare study materials.

The project addresses the main pain point of manual flashcard creation—time and effort—encouraging users to utilize effective study methods like spaced repetition.

## Tech Stack

**Frontend:**

- **Framework:** Astro 5 (Static content & Layouts)
- **UI Library:** React 19 (Interactive components)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Components:** Shadcn/ui

**Backend:**

- **Service:** Supabase (Backend-as-a-Service)
- **Database:** PostgreSQL
- **Authentication:** Supabase Auth

**AI Integration:**

- **Provider:** OpenRouter.ai (Access to models like OpenAI, Anthropic, etc.)

**Infrastructure:**

- **Hosting:** DigitalOcean (Dockerized)
- **CI/CD:** GitHub Actions

## Getting Started Locally

Follow these steps to set up and run the project locally.

### Prerequisites

- **Node.js**: Version `v22.14.0` (Recommended to use `nvm`)
- **npm** or similar package manager

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/Zuziap24/10xflash.git
    cd 10xflash
    ```

2.  **Set up Node version**
    If you have `nvm` installed, run:

    ```bash
    nvm use
    ```

3.  **Install dependencies**

    ```bash
    npm install
    ```

4.  **Environment Configuration**
    Create a `.env` file in the root directory based on `.env.example`:

    ```bash
    cp .env.example .env
    ```

    _Note: You will need to populate the `.env` file with your specific API keys (Supabase, OpenRouter)._

5.  **Run the development server**
    ```bash
    npm run dev
    ```
    The application should now be running at `http://localhost:4321`.

## Available Scripts

In the project directory, you can run:

- `npm run dev`: Runs the app in development mode.
- `npm run build`: Builds the app for production.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Runs ESLint to identify code issues.
- `npm run lint:fix`: Runs ESLint and automatically fixes fixable issues.
- `npm run format`: Formats code using Prettier.

## Project Scope

### Key Features

- **Deck Management**: Create, edit, and delete thematic flashcard decks.
- **AI Generation**: Generate flashcards automatically by pasting text (1k-10k characters).
- **Manual Control**: Manually add, edit, or delete flashcards; review and accept AI suggestions.
- **Study Mode**: Interactive study session with difficulty ratings (Easy/Hard) to schedule reviews.
- **User Accounts**: Secure registration and login to keep data private.

### Boundaries (MVP)

- Web application only (Responsive Web Design).
- No file imports (PDF/DOCX) - text copy-paste only.
- No deck sharing between users.
- No nested sub-decks.

## Project Status

The project is currently in the initial development phase (MVP Construction).
Current Version: `0.0.1`

## License

This project is licensed under the MIT License.
