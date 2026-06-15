# AIECommerce Analytics App

An AI-powered e-commerce analytics platform built with modern web technologies. This project combines Next.js frontend capabilities with AI integrations to provide intelligent commerce insights and analytics.

🌐 **Live Demo**: [https://aie-commerce-app.vercel.app](https://aie-commerce-app.vercel.app)

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Environment Setup](#environment-setup)
- [Backend](#backend)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **AI-Powered Analytics**: Leveraging Google Generative AI and OpenAI for intelligent insights
- **Real-Time Data**: Socket.io integration for live data updates
- **Advanced Data Tables**: AG Grid for powerful data visualization and management
- **Authentication**: Secure user authentication with NextAuth
- **Theme Support**: Dark and light theme support with Next Themes
- **Responsive UI**: Built with Tailwind CSS and Radix UI components
- **Type-Safe**: Full TypeScript support for better development experience
- **Charts & Visualizations**: Recharts for beautiful data visualization
- **Form Management**: React Hook Form with Zod validation

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) 14.1.3
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.3.0
- **UI Components**: Radix UI, Shadcn/ui
- **Forms**: React Hook Form + Zod
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Charts**: Recharts
- **Tables**: AG Grid Community

### Backend & Services
- **Database**: MongoDB with Mongoose
- **AI/ML**:
  - Google Generative AI
  - OpenAI
  - Vercel AI SDK
- **Authentication**: NextAuth
- **Real-Time**: Socket.io
- **Security**: bcryptjs

### Tools & Utilities
- **Package Manager**: npm
- **Linting**: ESLint
- **Animation**: Framer Motion
- **Date Handling**: date-fns
- **Icons**: Lucide React

## 📁 Project Structure

```
AIECommerce-app/
├── src/                    # Source code
├── backend/                # Python/Django backend
├── components.json         # Shadcn/ui components config
├── local-server.js         # Local development server
├── middleware.ts           # Next.js middleware
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project dependencies
```

## 📋 Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **MongoDB**: Local or cloud instance (MongoDB Atlas)
- **API Keys** (for AI services):
  - Google Generative AI API Key
  - OpenAI API Key

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Prajwal09-Walde/AIECommerce-app.git
   cd AIECommerce-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (see [Environment Setup](#environment-setup))

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🎯 Getting Started

### Development Mode

Run the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

The application supports hot reloading - changes will be reflected instantly as you edit files.

### Production Build

Build the application for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## 📝 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with increased memory |
| `npm run build` | Build the application for production |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint to check code quality |
| `npm run deploy` | Auto-commit changes and push to repository |

## 🔐 Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# AI Services
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key

# Authentication
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000

# Socket.io (if using real-time features)
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

**Note**: Never commit `.env.local` to version control. Use `.env.example` as a template for team members.

## 🔧 Backend

A Python/Django backend is available in the `/backend` directory for additional server-side functionality.

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

## 📦 Key Dependencies Explained

- **@google/generative-ai**: Google's generative AI API integration
- **@tanstack/react-query**: Powerful server state management
- **ag-grid-react**: Enterprise-grade data table component
- **mongoose**: MongoDB object modeling
- **next-auth**: Authentication for Next.js
- **socket.io-client**: Real-time bidirectional communication
- **zustand**: Lightweight state management
- **zod**: TypeScript-first schema validation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 📞 Support

For questions or issues, please open an issue on the [GitHub repository](https://github.com/Prajwal09-Walde/AIECommerce-app/issues).

---

**Created by**: [Prajwal09-Walde](https://github.com/Prajwal09-Walde)

**Last Updated**: June 2026
