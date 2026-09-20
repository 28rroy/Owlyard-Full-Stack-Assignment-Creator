# Owlyard — Full-Stack Assignment Creator

Developed as part of my Full Stack Developer internship at Owlyard. This repository contains my work on the assignment creator and management system. Shared with permission from Owlyard.

A web application for creating, managing, and taking educational assignments with LaTeX math support, multiple choice questions, automatic grading, and grade summaries. Built with Next.js frontend and AWS SAM serverless backend.

## Features

### For Teachers

- **Assignment Creation**: Create assignments with single-answer and multiple-answer questions
- **LaTeX Math Support**: KaTeX rendering for mathematical expressions and equations
- **Flexible Question Types**: Single choice and multiple choice questions with customizable point values
- **Assignment Management**: Edit, duplicate, delete, and organize assignments with bulk operations
- **Student Analytics**: Submission counts and average-score summaries
- **Auto-Grading**: Strict multiple choice validation with immediate feedback

### For Students

- **Clean Interface**: User-friendly assignment taking experience with progress tracking
- **LaTeX Rendering**: Mathematical expressions in questions and answers
- **Submission Feedback**: View results after submission; teachers control whether correct answers are displayed

## Architecture

The main application is in `full-stack-assignment-app/`.

```
full-stack-assignment-app/
├── nextjs-frontend/              # React/Next.js Frontend Application
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Route Handlers (Proxy to AWS)
│   │   ├── page.tsx              # Main application page
│   │   └── layout.tsx            # Root layout component
│   ├── components/               # Reusable React Components
│   │   ├── AssignmentCreator.tsx # Assignment creation interface
│   │   ├── AssignmentViewer.tsx  # Student assignment interface
│   │   ├── AssignmentManager.tsx # Teacher management dashboard
│   │   ├── StudentResultsViewer.tsx # Grade analysis interface
│   │   ├── GradesManager.tsx     # Overall grade management
│   │   ├── StudentGradesDetail.tsx # Individual student analysis
│   │   └── KaTeXHelp.tsx         # LaTeX syntax assistance
│   ├── contexts/                 # React Context Providers
│   │   └── UserContext.tsx       # Global user state management
│   ├── types/                    # TypeScript Type Definitions
│   └── tailwind.config.js        # Tailwind CSS configuration
└── aws-backend/                  # AWS SAM Serverless Backend
    ├── template.yaml             # SAM Infrastructure as Code
    ├── assignment_functions/     # Lambda Function Code
    │   ├── get_assignments.mjs   # Fetch assignments
    │   ├── save_assignment.mjs   # Create/update assignments
    │   ├── delete_assignment.mjs # Remove assignments
    │   ├── assignment_responses.mjs # Handle student submissions
    │   ├── save_grades.mjs       # Store calculated grades
    │   └── read_grades.mjs       # Retrieve grades
    └── samconfig.toml            # SAM deployment configuration
```

## Quick Start

### Prerequisites

- Node.js and npm for the Next.js frontend
- AWS CLI configured for your AWS account
- AWS SAM CLI; the backend template uses Node.js 20

### 1. Clone Repository

```bash
git clone https://github.com/28rroy/Owlyard-Internship.git
cd Owlyard-Internship/full-stack-assignment-app
```

### 2. Frontend Setup

```bash
cd nextjs-frontend
npm install
```

Create `.env.local` in `nextjs-frontend/` and set the backend URL after deployment:

```env
NEXT_PUBLIC_API_GATEWAY_URL=https://your-api-id.execute-api.region.amazonaws.com/Prod
```

### 3. AWS Backend Setup

From `full-stack-assignment-app/`:

```bash
cd aws-backend
sam build
sam deploy --guided
```

The template creates `AssignmentsTable` with `userId` as the partition key and `assignmentId` as the sort key. Create `gradesTable` separately with:

- Partition key: `assignmentId` (String)
- Sort key: `userId` (String)
- Global secondary index: `UserIdIndex`, with `userId` as partition key and `assignmentId` as sort key

The template also references an existing S3 bucket through `S3BucketName`; it does not create that bucket.

### 4. Start Development

Copy the deployment output `ApiUrl` into `.env.local`, then run from `nextjs-frontend/`:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Grading System Deep Dive

### Dual-Table Architecture

The application stores assignments and grades in two DynamoDB tables:

1. **AssignmentsTable**: Primary storage for assignment data and student responses
2. **gradesTable**: Calculated scores and per-question grading details

### Assignment Submission Flow

The backend loads the answer key, calculates the score, and saves the response in `AssignmentsTable`. It also attempts to save a grade record in `gradesTable`; a grade-table write failure does not prevent a successful submission response.

### Grading Logic

- **Single-answer questions:** The selected option must be included in the correct options.
- **Multiple-answer questions:** Students must select all correct options, no incorrect options, and exactly the expected number of options. No partial credit is awarded.

### API Endpoint Reference

| Backend endpoint | Method | Purpose |
| --- | --- | --- |
| `/save-assignment` | POST | Create/update assignment |
| `/get-assignments` | GET | Fetch assignments |
| `/delete-assignment` | DELETE | Remove assignment |
| `/assignment-responses` | POST / GET | Submit answers / retrieve a response |
| `/save-grades` | POST | Store grades |
| `/read-grades` | GET | Retrieve grades |

## Technology Stack

### Frontend

- **Framework**: Next.js 15 (App Router) with React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4 with custom components
- **Math Rendering**: KaTeX 0.16 for LaTeX expressions
- **Icons**: Lucide React for consistent iconography
- **State Management**: React Context + Hooks pattern

### Backend (AWS SAM Serverless)

- **Runtime**: Node.js 20 with ES modules
- **Framework**: AWS SAM (Serverless Application Model)
- **Functions**: AWS Lambda
- **Database**: Amazon DynamoDB with GSI indexing
- **API**: AWS API Gateway with CORS configuration
- **Permissions**: Shared Lambda execution role with DynamoDB, S3, and logging policies

## Configuration Options

### Assignment Settings

- **Grading Mode**: Points-based vs completion-based assessment
- **Feedback Display**: Show/hide correct answers after submission

### Question Configuration

- **LaTeX Support**: Mathematical expressions with error handling
- **Point Values**: Flexible scoring system per question

## Implementation Note

Teacher/student roles are controlled through React context in this version. The repository does not implement production authentication or API authorization.
