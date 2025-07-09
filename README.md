# FinSense - AI-Powered Personal Finance Management

## 🎬 Product Demo

Experience FinSense in action! Watch the demo video below to see how AI-powered receipt scanning, conversational chat, and financial insights work together to simplify your personal finance management.

**Demo Video:**

[![FinSense Demo Video](https://user-images.githubusercontent.com/placeholder/demo-thumbnail.png)](./FinSense%20-%20SD%20480p.mov)

- [Download/Watch: FinSense - SD 480p.mov](./FinSense%20-%20SD%20480p.mov)

> _If the video does not play in your browser, right-click the link above and choose "Download Linked File As..." to save and view locally._

FinSense is an intelligent, web-first expense and bill tracking application that transforms how users manage their personal finances. By leveraging AI-powered optical character recognition (OCR) and a natural language interface, FinSense eliminates the tedious manual entry of expenses and provides intelligent insights into spending patterns.

## ✨ Features

- 🔍 **AI-Powered Receipt Scanning**: Upload receipts and automatically extract transaction data using OCR
- 💬 **Conversational AI Chat**: Ask questions about your finances in natural language and get structured responses
- 📊 **Interactive Dashboard**: Visual overview of spending patterns, trends, and budget usage
- 🎯 **Budget Management**: Set and track spending budgets with real-time alerts and notifications
- 📱 **Transaction Management**: Add, edit, and categorize transactions with pagination support (10 per page)
- 🏷️ **Category System**: Organize expenses with custom categories and visual indicators
- 🔐 **Secure Authentication**: JWT-based authentication with row-level security
- 🌙 **Dark Mode Support**: Toggle between light and dark themes
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 💰 **Multi-Currency Support**: Track expenses in different currencies
- 📈 **Advanced Analytics**: Spending analysis with charts and breakdowns

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Cache**: Redis for session management
- **Authentication**: JWT with bcrypt password hashing
- **AI Services**: DeepSeek API for chat and analysis, Tesseract OCR for receipt processing
- **API Documentation**: RESTful APIs with comprehensive error handling

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand for global state
- **HTTP Client**: Axios with interceptors for API calls
- **Routing**: React Router v6 with protected routes
- **Build Tool**: Vite for fast development and building
- **Charts**: Recharts for data visualization
- **Date Handling**: date-fns for date manipulation

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Development**: Hot reload for both frontend and backend
- **Database**: PostgreSQL 15 with automatic migrations
- **Cache**: Redis 7 with persistence
- **Environment**: Environment-based configuration

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Running with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FinSense
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (see Environment Variables section)
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - Database: localhost:5432 (user: finsense_user, password: finsense_password)
   - Redis: localhost:6379

### Local Development Setup

1. **Backend Setup**
   ```bash
   # Install dependencies
   npm install
   
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   
   # Run database migrations
   npm run migrate
   
   # Start development server
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Start development server
   npm run dev
   ```

## 🔧 Environment Variables

### Backend (.env)
```bash
# Database Configuration
DATABASE_URL=postgresql://finsense_user:finsense_password@localhost:5432/finsense

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

# AI Services
DEEPSEEK_API_KEY=your-deepseek-api-key

# CORS Configuration
CORS_ORIGIN=http://localhost:3001
```

### Frontend (frontend/.env)
```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

## 📖 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Transaction Endpoints
- `GET /api/transactions` - Get paginated transactions with filters
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/:id` - Get transaction details
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/spending-summary` - Get spending summary
- `GET /api/transactions/category-summary` - Get category breakdown

### Budget Endpoints
- `GET /api/budgets` - Get user budgets
- `POST /api/budgets` - Create new budget
- `GET /api/budgets/:id` - Get budget details
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

### Category Endpoints
- `GET /api/categories` - Get user categories
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Receipt Processing
- `POST /api/receipts/upload` - Upload and process receipt
- `GET /api/receipts/:id` - Get receipt processing status

### AI Chat
- `POST /api/chat/message` - Send message to AI assistant
- `GET /api/chat/history` - Get chat history

## 🎨 UI Components

The application uses a comprehensive design system with:
- **Cards**: For displaying information sections
- **Tables**: For transaction listings with pagination
- **Forms**: For data input with validation
- **Modals**: For confirmations and detailed views
- **Charts**: For spending visualization
- **Filters**: For data filtering and searching
- **Responsive Navigation**: Mobile-friendly sidebar and header

## 📊 Features Deep Dive

### Dashboard
- Real-time spending statistics
- Budget usage indicators with proper number validation
- 7-day spending trend chart
- Category spending breakdown with improved legend
- Recent transactions list
- Quick action buttons

### Transaction Management
- Paginated transaction listing (10 per page)
- Advanced filtering by category (dropdown), type, and date range
- Transaction creation with category dropdown
- Receipt upload and OCR processing
- Transaction details modal with receipt information
- Numbered pagination with Previous/Next controls

### Budget System
- Create budgets for specific categories
- Real-time budget tracking with proper number validation
- Alert thresholds and notifications
- Budget performance visualization
- Monthly, weekly, and yearly budget periods

### AI Chat Assistant
- Natural language financial queries
- Structured JSON responses for better UX
- Transaction analysis and insights
- Budget recommendations
- Spending pattern analysis
- Custom renderers for budget breakdowns and spending analysis

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Row-level security in PostgreSQL
- Password hashing with bcrypt
- CORS protection
- Input validation and sanitization
- Rate limiting (planned)

## 🛠️ Development Commands

```bash
# Backend
npm run dev          # Start development server
npm run build        # Build for production
npm run migrate      # Run database migrations
npm test            # Run tests
npm run lint        # Run linting

# Frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run linting
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Known Issues

- Receipt OCR accuracy depends on image quality
- Some chart animations may be slow on older devices
- Mobile responsiveness could be improved for very small screens

## 🚀 Future Enhancements

- [ ] Mobile app development
- [ ] Bank account integration
- [ ] Advanced reporting features
- [ ] Expense categorization automation
- [ ] Multi-user support
- [ ] Data export functionality
- [ ] Push notifications
- [ ] Recurring transaction support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- DeepSeek API for AI-powered chat functionality
- Tesseract OCR for receipt processing
- Recharts for beautiful data visualizations
- Tailwind CSS and shadcn/ui for the design system