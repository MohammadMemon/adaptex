# Adaptex - Structured Study Tracker

Adaptex is a full-stack study tracking platform built to help students optimize their exam preparation through structured and continuous learning. By simply uploading a syllabus and Previous Year Questions (PYQs), Adaptex automatically structures the topics, maps the relevant PYQs, and generates a personalized day-wise study schedule.

## Core Features

*   **Automated Syllabus Extraction:** Upload your syllabus and PYQs (PDF format). The application uses client-side OCR (Tesseract) to extract text, and the Google Gemini API to intelligently structure your units, topics, and weightage into a clean JSON format without manual data entry.
*   **Smart Day-Wise Scheduling:** Input the number of days until your exam, and Adaptex will distribute your topics logically based on unit weightage, creating an actionable and structured daily plan.
*   **Interactive Daily Tracker:** A focused, distraction-free interface to track your daily progress. Includes targeted "Focus Points" and "Revision Tips" generated during the data structuring phase for every topic. Mark topics as Done, Weak, or Skipped to maintain continuous learning.
*   **Revision Center:** Easily catch up on topics you marked as Weak or Skipped to ensure no gaps in your preparation.
*   **Mobile-First UI:** Built with a clean, neutral, and responsive aesthetic. Includes a bottom navigation bar for mobile users and smooth physics-based animations.

## Technology Stack

*   **Framework:** Next.js 14+ (App Router)
*   **Styling:** Tailwind CSS & custom CSS variables for a neutral, cool-gray aesthetic.
*   **Animations:** Framer Motion
*   **Database & Auth:** Supabase (PostgreSQL with Row Level Security & Google OAuth)
*   **Processing Engine:** Tesseract.js (Client-side OCR) & Google Generative API (Data Structuring)

## Getting Started

### Prerequisites
*   Node.js 18.x or later
*   A Supabase Project
*   A Google Generative API Key

### 1. Clone the repository
```bash
git clone https://github.com/MohammadMemon/adaptex.git
cd adaptex
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root of your project and add the following keys:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Processing API
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key
```

### 4. Database Setup (Supabase)
Ensure your Supabase project has the correct tables set up. You will need:
1.  `subjects`
2.  `units`
3.  `topics`
4.  `pyqs`

Row Level Security (RLS) should be enabled on all tables so users can only access their own data via `user_id`.

### 5. Run the Development Server
```bash
npm run dev
```
Open http://localhost:3000 with your browser to see the result.

## Deployment

This project is optimized for deployment on Vercel. 
1. Push your code to GitHub.
2. Import the project into Vercel.
3. Add your environment variables in the Vercel dashboard.
4. Deploy!

## Contributing

Contributions are welcome. Feel free to open an issue or submit a Pull Request.