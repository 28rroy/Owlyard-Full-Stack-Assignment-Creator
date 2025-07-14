# Assignment Creator App

A full-stack web application for teachers to create and manage quiz assignments for students.

## 🚀 Features

- **Create Assignments**: Build multiple-choice quizzes with custom questions
- **Edit Assignments**: Modify existing assignments with full CRUD operations
- **Point Values**: Assign custom point values to each question
- **Explanations**: Add explanations for correct answers
- **Validation**: Client and server-side validation for data integrity
- **Cloud Storage**: Assignments stored in AWS DynamoDB with S3 backup

## 🏗️ Architecture

### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components with Lucide icons
- **State Management**: React hooks (useState, useEffect)

### Backend (AWS Serverless)
- **Functions**: AWS Lambda (Node.js 20.x)
- **API**: Amazon API Gateway with CORS support
- **Database**: Amazon DynamoDB
- **Storage**: Amazon S3 for .quiz file backups
- **Infrastructure**: AWS SAM (Serverless Application Model)

## 📁 Project Structure

```
full-stack-assignment-app/
├── nextjs-frontend/           # Next.js frontend application
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/
│   │   └── AssignmentCreator.tsx
│   └── package.json
├── aws-backend/              # AWS SAM backend
│   ├── assignment_functions/
│   │   ├── get_assignments.mjs
│   │   ├── save_assignment.mjs
│   │   └── package.json
│   └── template.yaml         # SAM template
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- AWS CLI configured
- AWS SAM CLI installed

### Frontend Setup
```bash
cd nextjs-frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd aws-backend
sam build
sam deploy --guided
```

### Environment Configuration
Create `.env.local` in the frontend directory:
```env
NEXT_PUBLIC_API_GATEWAY_URL=https://your-api-id.execute-api.us-east-2.amazonaws.com/Prod
```

## 🎯 Usage

1. **Create Assignment**: Click "Create Assignment" to start building a new quiz
2. **Add Questions**: Enter questions with multiple choice options
3. **Set Correct Answers**: Select which options are correct
4. **Add Explanations**: Provide explanations for answers (optional)
5. **Set Points**: Assign point values to each question
6. **Save**: Save the assignment to the cloud database
7. **View/Edit**: View all assignments and edit existing ones

## 🔧 API Endpoints

- `GET /get-assignments` - Retrieve all assignments
- `POST /save-assignment` - Create or update an assignment

## 📊 Database Schema

### AssignmentsTable (DynamoDB)
```json
{
  "assignmentId": "string (UUID)",
  "title": "string",
  "questions": {
    "1": {
      "question": "string",
      "options": ["string"],
      "correctOptions": [number],
      "explanation": "string",
      "points": number
    }
  },
  "createdAt": "string (ISO date)",
  "totalQuestions": number,
  "status": "string"
}
```

## 🔒 Security Features

- Input validation and sanitization
- Character limits on questions and options
- CORS protection
- IAM role-based access control
- Environment variable protection

## 🚀 Deployment

The application uses AWS SAM for infrastructure as code:

```bash
# Build and deploy
sam build
sam deploy
```

## 📝 Development Notes

- Frontend runs on `http://localhost:3000`
- Backend automatically deploys to AWS with SAM
- Log retention set to 30 days
- DynamoDB uses on-demand billing
- S3 backup storage for .quiz files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is for educational purposes.