=============================================
  WakeelAI v2 - Complete System
=============================================

FILES IN THIS FOLDER:
  server.js         - Main backend server
  index.html        - Main app (user facing)
  documents.html    - Legal document requests
  lawyer-portal.html - Lawyer login & research
  admin.html        - Your admin panel
  config.json       - Your Groq API key
  lawyers.json      - Lawyer database
  documents.json    - Document requests
  admin.json        - Admin password & settings
  start.bat         - Windows one-click start

SETUP (LOCAL PC):
  1. Install Node.js from nodejs.org
  2. Double-click start.bat
  3. Paste Groq key when asked
  4. Open http://localhost:3000

DEPLOY TO RAILWAY:
  1. Upload all files to GitHub
     (DO NOT upload config.json)
  2. Connect Railway to GitHub repo
  3. Add environment variable:
     GROQ_API_KEY = your_groq_key
  4. Railway gives you a live URL

ADMIN PANEL:
  URL: yoursite.com/admin
  Default password: wakeel2024admin
  CHANGE THIS in admin.json after setup!

ADDING A LAWYER (STEP BY STEP):
  1. Lawyer pays Rs 2000-4000 to your JazzCash
  2. Go to admin panel
  3. Click "Add New Lawyer"
  4. Fill their details
  5. Click "Generate" for access code
  6. Save and send them the code via WhatsApp
  7. They login at yoursite.com/lawyer-portal

DOCUMENT REQUESTS:
  1. User submits request at /documents
  2. You get the request in admin panel
  3. User pays via JazzCash
  4. You click "Generate Document" in admin
  5. Document is ready - user checks status

PRICING:
  Basic Lawyer:    Rs 2,000/month
  Premium Lawyer:  Rs 4,000/month
  Documents:       Rs 400-700 per doc
=============================================
