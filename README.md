# 📚 Full-Stack Assignment Management System

A comprehensive web application for creating, managing, and taking educational assignments with advanced features like LaTeX math support, multiple choice questions, automatic grading, and detailed analytics.

## 🌟 Features

### 🎓 For Teachers
- **Assignment Creation**: Intuitive interface for creating assignments with multiple question types
- **LaTeX Math Support**: Full KaTeX integration for mathematical expressions and equations
- **Flexible Question Types**: Single choice and multiple choice questions with customizable point values
- **Assignment Management**: Edit, duplicate, delete, and organize assignments
- **Student Analytics**: Comprehensive grade analysis with class statistics
- **Real-time Results**: View student submissions and detailed performance metrics
- **Bulk Operations**: Manage multiple assignments simultaneously
- **Export Capabilities**: Download grades and performance data

### 👨‍🎓 For Students
- **Clean Interface**: User-friendly assignment taking experience
- **Progress Tracking**: Visual progress indicators and question navigation
- **LaTeX Rendering**: Beautiful mathematical expressions in questions
- **Immediate Feedback**: Instant results after submission (configurable)
- **Multiple Attempts**: Retake assignments if enabled by teacher
- **Grade History**: View past performance and improvement trends

### 🔧 Technical Features
- **Modern Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Real-time Updates**: Live data synchronization
- **Security**: Role-based access control and data protection
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Performance Optimized**: Fast loading and smooth interactions
- **API Integration**: RESTful backend architecture

## 🏗️ Architecture

```
full-stack-assignment-app/
├── nextjs-frontend/           # React/Next.js Frontend
│   ├── app/                   # Next.js App Router
│   ├── components/            # Reusable React Components
│   ├── contexts/              # React Context Providers
│   ├── types/                 # TypeScript Type Definitions
│   └── api/                   # API Route Handlers
├── nodejs-backend/            # Node.js/Express Backend
│   ├── routes/                # API Route Definitions
│   ├── models/                # Data Models
│   ├── middleware/            # Express Middleware
│   └── utils/                 # Utility Functions
└── docs/                      # Documentation
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.18.0+ 
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/full-stack-assignment-app.git
   cd full-stack-assignment-app
   ```

2. **Setup Frontend**
   ```bash
   cd nextjs-frontend
   npm install
   ```

3. **Setup Backend**
   ```bash
   cd ../nodejs-backend
   npm install
   ```

4. **Environment Configuration**
   
   Create `.env.local` in the frontend directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```
   
   Create `.env` in the backend directory:
   ```env
   PORT=3001
   NODE_ENV=development
   ```

5. **Start Development Servers**
   
   Frontend (Terminal 1):
   ```bash
   cd nextjs-frontend
   npm run dev
   ```
   
   Backend (Terminal 2):
   ```bash
   cd nodejs-backend
   npm start
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 📱 Usage Guide

### Teacher Workflow

1. **Create Assignment**
   - Click "Create Assignment"
   - Add title and configure settings
   - Create questions with LaTeX support
   - Set correct answers and point values
   - Save and publish

2. **Manage Assignments**
   - View all assignments in Assignment Manager
   - Edit existing assignments
   - Duplicate assignments for reuse
   - Delete unwanted assignments

3. **Monitor Student Progress**
   - View real-time submissions
   - Analyze class performance
   - Export grade reports
   - Provide feedback

### Student Workflow

1. **Take Assignment**
   - Enter Student ID
   - Select available assignment
   - Answer questions with LaTeX support
   - Submit responses

2. **View Results**
   - See immediate feedback (if enabled)
   - Review correct answers
   - Track grade history
   - Monitor improvement

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **Math Rendering**: KaTeX 0.16
- **Icons**: Lucide React
- **State Management**: React Context + Hooks

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: JavaScript/TypeScript
- **Data Storage**: JSON-based file system
- **Middleware**: CORS, Body Parser
- **Security**: Input validation, sanitization

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Code Formatting**: Prettier (configurable)
- **Git Hooks**: Pre-commit validation

## 📊 Component Architecture

### Core Components

| Component | Purpose | Features |
|-----------|---------|----------|
| `AssignmentCreator` | Assignment creation/editing | LaTeX support, multiple question types, validation |
| `AssignmentViewer` | Student assignment interface | Progress tracking, math rendering, auto-save |
| `AssignmentManager` | Teacher assignment management | Bulk operations, search, filtering |
| `StudentResultsViewer` | Grade analysis interface | Statistics, detailed feedback, export |
| `GradesManager` | Overall grade management | Class analytics, student summaries |
| `StudentGradesDetail` | Individual student analysis | Performance trends, improvement tracking |

### Utility Components

| Component | Purpose | Features |
|-----------|---------|----------|
| `KaTeXHelp` | LaTeX syntax assistance | Interactive examples, reference guide |
| `KaTeXRenderer` | Math expression rendering | Error handling, performance optimization |
| `UserContext` | Global user state | Authentication, role management |

## 🔐 Security Features

- **Role-Based Access**: Separate teacher and student interfaces
- **Data Validation**: Input sanitization and validation
- **Secure API**: Protected endpoints with proper error handling
- **Student Data Protection**: Answers hidden from student view
- **Session Management**: User state persistence

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Mobile-first design approach
- **Accessibility**: WCAG compliant components
- **Dark Mode Ready**: Prepared for theme switching
- **Loading States**: Smooth loading indicators
- **Error Handling**: User-friendly error messages

## 📈 Performance Optimizations

- **Code Splitting**: Automatic Next.js optimization
- **Image Optimization**: Next.js Image component
- **Lazy Loading**: Component-level lazy loading
- **Caching**: Strategic caching implementation
- **Bundle Analysis**: Optimized package imports

## 🔧 Configuration Options

### Assignment Settings
- **Grading**: Points-based or completion-based
- **Feedback**: Show/hide correct answers
- **Timing**: Time limits and attempt restrictions
- **Access**: Student visibility controls

### Question Types
- **Single Choice**: One correct answer
- **Multiple Choice**: Multiple correct answers
- **LaTeX Support**: Mathematical expressions
- **Rich Text**: Formatted content support

## 📝 API Documentation

### Core Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/assignments` | Fetch assignments |
| `POST` | `/api/assignments` | Create/update assignment |
| `DELETE` | `/api/assignments/:id` | Delete assignment |
| `POST` | `/api/assignment-responses` | Submit student response |
| `GET` | `/api/grades` | Fetch grade data |

### Request/Response Examples

**Create Assignment**
```javascript
POST /api/assignments
{
  "title": "Algebra Quiz",
  "questions": {
    "1": {
      "question": "Solve: $x^2 = 16$",
      "options": ["x = 4", "x = ±4", "x = 8"],
      "correctOptions": [1],
      "points": 10
    }
  },
  "isGradedForPoints": true
}
```

## 🧪 Testing

### Frontend Testing
```bash
cd nextjs-frontend
npm run test        # Run tests
npm run test:watch  # Watch mode
npm run test:coverage # Coverage report
```

### Backend Testing
```bash
cd nodejs-backend
npm test           # Run API tests
npm run test:unit  # Unit tests only
```

## 🚢 Deployment

### Frontend Deployment (Vercel)
```bash
npm run build
npm run start
```

### Backend Deployment (Railway/Heroku)
```bash
npm run build
npm run start:prod
```

### Docker Deployment
```bash
docker-compose up -d
```

## 🔍 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Module Not Found**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**LaTeX Not Rendering**
- Check KaTeX syntax in help modal
- Verify math expressions are properly escaped
- Ensure proper dollar sign placement

**API Connection Issues**
- Verify backend server is running
- Check CORS configuration
- Validate environment variables

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open Pull Request**

### Code Style
- Use TypeScript for new components
- Follow existing naming conventions
- Add comments for complex logic
- Maintain responsive design patterns

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **KaTeX** for mathematical expression rendering
- **Lucide** for beautiful icons
- **Tailwind CSS** for utility-first styling
- **Next.js** team for the amazing framework
- **React** team for the robust library

---

**Built with ❤️ for educators and students worldwide**

⭐ **Star this repository if it helped you!**