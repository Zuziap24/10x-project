# View Implementation Plan: Deck Details View

## 1. Overview

The **Deck Details View** is the central hub for managing a specific flashcard deck. It allows users to view statistics, manage flashcards (manual add/edit/delete), and most importantly, access the **AI Flashcard Generation** workflow. This view orchestrates the interaction between the user and the LLM services, providing a review stage before committing cards to the database.

## 2. View Routing

- **Path**: `/decks/[id]`
- **Page Type**: Astro Page with a hydrated React Root Component.
- **Route Parameter**: `id` (Deck UUID).

## 3. Component Structure

```text
src/pages/decks/[id].astro (Astro Page Shell)
└── <DeckDetailsPage /> (React "Island" - client:only)
    ├── <DeckHeader />
    │   ├── <StatsBadges />
    │   └── <ActionToolbar /> (Study, Add Manual, Generate AI)
    ├── <FlashcardList /> (Virtualized or Paginated)
    │   └── <FlashcardItem />
    │       └── <FlashcardActions /> (Edit, Delete)
    ├── <AIGenerationDialog /> (Wizard Modal)
    │   ├── <GenerationInputStep /> (Step 1)
    │   └── <GenerationReviewStep /> (Step 2)
    │       └── <ReviewItem />
    ├── <ManualFlashcardDialog /> (Add/Edit Modal)
    └── <DeleteDeckAlert />
```

## 4. Component Details

### `DeckDetailsPage` (Container)

- **Description**: The root React component that provides the context for data fetching and state management. It handles the visibility of modals.
- **Main Elements**: Wrapper `div`, `Toaster` (for notifications), Modals.
- **Handled Events**: Opening/Closing modals, triggering data refreshes.
- **Types**: `DeckDto`, `FlashcardDto`.

### `DeckHeader`

- **Description**: Displays deck title, description, and high-level stats. Contains primary actions.
- **Main Elements**: Title (`h1`), `Badge` (count), "Study" button (Link), "Add" button, "Generate" button.
- **Props**: `deck: DeckDto`.
- **Events**: `onStartStudy`, `onAddManual`, `onGenerateAI`.

### `AIGenerationDialog` (Complex Wizard)

- **Description**: Handles the 2-step process of AI generation (Input -> Review).
- **Main Elements**: `Dialog` (Shadcn), `Stepper` (visual indicator), `Textarea` (Input), `ScrollArea` (Review).
- **States**:
  - `INPUT`: User enters text.
  - `loading`: Waiting for API.
  - `REVIEW`: User edits/selects suggestions.
- **Validation**:
  - Source text: 1000 - 10000 characters.
- **Types**: `GenerateFlashcardsCommand`, `GenerateFlashcardsResponseDto`.

### `GenerationReviewStep`

- **Description**: Displays the list of generated suggestions for approval.
- **Main Elements**: List of `ReviewItem`s, "Select All" toggle, "Save Selected" button.
- **State**: Local state for `modifiedSuggestions` (tracking edits and selection).
- **Events**: `onSave(selectedCards)`.

### `ManualFlashcardDialog`

- **Description**: Form for manually adding or editing a single flashcard.
- **Main Elements**: `Dialog`, `Form` (React Hook Form), `Input` (Front), `Textarea` (Back).
- **Validation**:
  - Front/Back: Required, non-empty.
- **Props**: `mode: 'create' | 'edit'`, `initialData?: FlashcardDto`.

### `FlashcardList`

- **Description**: Displays the list of existing cards. Should handle "Load More" or infinite scroll if many cards exist.
- **Main Elements**: Grid or Stack of `FlashcardItem`.
- **Props**: `flashcards: FlashcardDto[]`, `onEdit(card)`, `onDelete(card)`.

## 5. Types

### View Models

```typescript
// For the AI Review Step
interface SuggestionViewModel extends GeneratedSuggestionDto {
  tempId: string; // Unique ID for React keys (uuid v4)
  isSelected: boolean; // Checkbox state
  isEdited: boolean; // Dirty flag to set 'was_edited' in payload
  originalFront: string; // To compare changes
  originalBack: string; // To compare changes
}

// For Component Props
interface DeckDetailsProps {
  deckId: string;
}
```

### API Interface Types

Referencing `src/types.ts`:

- `GenerateFlashcardsCommand`
- `GenerateFlashcardsResponseDto`
- `AcceptFlashcardsCommand`
- `FlashcardDto`

## 6. State Management

The view relies heavily on **TanStack Query** for server state and **React.useState** for UI state.

### React Query Hooks

- `useDeck(id)`: Fetches deck details.
- `useFlashcards(id, params)`: Fetches paginated flashcards (useInfiniteQuery recommended).
- `useGenerateFlashcards()`: Mutation for `POST /generate`.
- `useAcceptFlashcards()`: Mutation for `POST /accept`.
- `useCreateFlashcard()`: Mutation for `POST /flashcards`.
- `useUpdateFlashcard()`: Mutation for `PATCH /flashcards/[id]`.
- `useDeleteFlashcard()`: Mutation for `DELETE /flashcards/[id]`.

### Local State

- `aiWizardState`: `{ step: 'input' | 'review', sourceText: string, generationId: string | null }`
- `suggestions`: `SuggestionViewModel[]` (Managed inside the Wizard).
- `manualModalState`: `{ isOpen: boolean, mode: 'create' | 'edit', cardId?: string }`.

## 7. API Integration

### 1. Fetch Deck

- **Endpoint**: `GET /api/decks/:id`
- **Response**: `DeckDto`

### 2. Fetch Flashcards

- **Endpoint**: `GET /api/decks/:id/flashcards`
- **Response**: `PaginatedResponse<FlashcardDto>`

### 3. Generate AI Suggestions

- **Endpoint**: `POST /api/decks/:id/generate`
- **Request**: `{ source_text: string, count: number }`
- **Response**: `GenerateFlashcardsResponseDto` (contains `suggestions` and `generation_id`)

### 4. Accept Suggestions

- **Endpoint**: `POST /api/generations/:id/accept`
- **Request**: `{ flashcards: { front, back, was_edited }[] }`
  - _Note_: Filter the local `SuggestionViewModel` list for `isSelected === true`, map to this structure.
- **Response**: `AcceptFlashcardsResponseDto`

## 8. User Interactions

### AI Generation Flow

1.  User clicks **"Generate with AI"**.
2.  Modal opens at **Input Step**.
3.  User pastes text (>1000 chars) and clicks **"Generate"**.
4.  UI shows **Loading Spinner** (calls `useGenerateFlashcards`).
5.  On success, UI switches to **Review Step**.
6.  User sees ~10 suggestions.
    - Can edit text inputs (Front/Back).
    - Can toggle checkboxes (Select/Deselect).
7.  User clicks **"Save Selected"**.
8.  UI calls `useAcceptFlashcards` with the selected subset.
9.  On success, Modal closes, `useFlashcards` is invalidated/refetched, toast behavior "Created X cards".

### Manual Management

1.  **Delete**: User clicks trash icon on a card -> Confirmation Dialog -> `useDeleteFlashcard` -> Optimistic update or Refetch.
2.  **Edit**: User clicks pencil icon -> Manual Modal opens pre-filled -> Save -> `useUpdateFlashcard`.

## 9. Conditions and Validation

### AI Generation

- **Input Length**: Must be between 1000 and 10000 characters.
  - _Validation_: Client-side Zod schema + UI character counter (Red if out of bounds).
- **Selection**: At least 1 card must be selected to enable "Save" button in Review step.

### Flashcard Content

- **Required Fields**: Front and Back cannot be empty or whitespace only.

## 10. Error Handling

- **API Errors (4xx/5xx)**:
  - Display toast notifications with error messages (e.g., "Failed to generate suggestions").
  - For 404 (Deck not found), redirect to Dashboard.
- **Rate Limits (429)**:
  - Specific friendly error message: "You've reached your generation limit. Please try again later."
- **Empty Generation**:
  - If AI returns 0 suggestions (rare), show specific warning in the modal.

## 11. Implementation Steps

1.  **Scaffold Page**: Create `src/pages/decks/[id].astro` to capture the ID and render the React root.
2.  **Create API Service Functions**: Add wrappers for the endpoints in `src/lib/api/decks.ts`.
3.  **Implement Hooks**: Create custom hooks in `src/hooks/useDecks.ts` using TanStack Query.
4.  **Build Components (Bottom-Up)**:
    - `FlashcardItem` & `FlashcardList`.
    - `ManualFlashcardDialog` (Reuse Shadcn Dialog/Form).
5.  **Build AI Wizard**:
    - Create `AIGenerationAction` component (Button -> Modal).
    - Implement `GenerateStep` (Input).
    - Implement `ReviewStep` (List of editable items).
    - Wire up the `generate` and `accept` mutations.
6.  **Assemble DeckDetailsPage**: Combine components, handle loading states, and error boundaries.
7.  **Testing**: Verify the flow: Create Deck -> Enter -> AI Generate -> Review -> Save -> Edit Manual -> Delete.
