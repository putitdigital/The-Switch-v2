# The Switch - Banner & Website Automation Platform

**Version:** 2.0  
**Tech Stack:** Angular 13, Express.js, MySQL, Node.js, SCSS  
**License:** MIT

## 📋 Project Overview

The Switch is a comprehensive digital asset automation platform designed to streamline the creation and management of digital advertising banners and website templates. It empowers users to generate multiple variations of creative assets automatically, reducing manual work and ensuring consistency across campaigns.

### Core Features

#### 1. **Banner Automation Engine**
Automatically generate hundreds of digital ad banner variations from a single template and asset library.

**Banner Builder Workflow:**
- **Setup Phase:** Administrators configure Clients, Projects, Templates, and Components
- **Selection Phase:** Users select a client, project, and template from the dashboard
- **Asset Phase:** Users choose multiple banner sizes and upload variations of creative assets (headlines, CTAs, images)
- **Generation Phase:** The system generates every possible combination of uploading assets, creating unlimited variations
- **Export Phase:** Export banners as:
  - Static images (JPG)
  - Animated GIFs
  - Interactive HTML5 ads
  - Packaged ZIP files for bulk download

**Key Capabilities:**
- Multi-size banner support (IAB standard sizes)
- Animation framework with easing types and keyframe control
- Event-driven component interactions
- GIF animation generation with optimized compression
- Batch export with automatic packaging

#### 2. **Website Template Editor** *(v2.0 New)*
Design and customize website templates with real-time WYSIWYG editing capabilities.

**Website Template Features:**
- **Live Preview:** Interactive iframe-based preview of website templates in real-time
- **Click-to-Select:** Click directly on elements in the preview to select and edit them
- **Dual-Mode Editor:**
  - **Button Mode:** Edit text content, text color, background color, and vertical positioning
  - **Div Mode:** Edit background color, width, height, border styles, and border radius
- **Floating Editor UI:** Draggable popover editor that floats over the preview for maximum visibility
- **2D Drag Support:** Reposition the editor popover freely within the preview area
- **CSS Value Introspection:** Automatically reads and displays actual CSS-applied values from the DOM
- **HTML/CSS/JS Management:** Store and manage custom HTML, CSS, and JavaScript for templates

**Editor Capabilities:**
- Visual template gallery with preview thumbnails
- Multi-step template configuration wizard
- Element selector with categorized buttons and divs
- Real-time computed style reading
- Inline style application for changes

#### 3. **Project Management**
Organize creative work across multiple clients and projects.

**Key Entities:**
- **Clients:** Top-level organization for grouping projects and templates
- **Projects:** Container for templates and banners within a client
- **Templates:** Reusable layouts defining banner structure and editable components
- **Components:** Building blocks (Text, Images, Shapes, Buttons) with animation support
- **Containers:** Frame containers that define animation sequences and timing
- **Banners:** Generated ad variations from templates and assets
- **Banner Types:** Categorization system (e.g., Standard, Rich Media, Interactive)
- **Banner Sizes:** IAB standard dimensions (e.g., 300x250, 728x90, 970x250)

#### 4. **Animation Framework**
Professional animation capabilities for creating dynamic, engaging ads.

**Animation Features:**
- Timeline-based animation editor
- Component keyframe animation
- Easing type library (ease-in, ease-out, ease-in-out, linear, custom)
- Event-driven triggers (click, hover, load, timer)
- Animation sequencing and layering
- Global and stage-specific animation playback
- Animation preview in editor

#### 5. **Asset Management**
Centralized asset library for organizing fonts, components, and templates.

**Asset Types:**
- **Font Types:** Predefined font families for consistent typography
- **Boilerplate Templates:** HTML5 Canvas starter templates for advanced animations
- **Component Templates:** Reusable component definitions
- **Public Templates:** Shared template assets and resources

#### 6. **User & Access Control**
Role-based access management and user administration.

**Features:**
- Multi-user support with authentication
- Account management
- CSRF protection via token validation
- Request validation middleware
- JWT token-based authorization
- Session management with secure cookies

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+) and npm/pnpm
- MySQL database (v5.7+)
- Angular CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/The-Switch-v2.git
   cd The-Switch-v2
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure MySQL Connection**
   Edit `api/v1/config.json` with your local MySQL credentials:
   ```json
   {
     "database": "banner_automation",
     "username": "root",
     "password": "your_password",
     "host": "localhost",
     "dialect": "mysql"
   }
   ```

4. **Start Development Servers**
   ```bash
   npm start
   ```
   This runs both the Angular app and Node.js server in parallel:
   - **Frontend:** http://localhost:4200
   - **API:** http://localhost:4000

### Build for Production
```bash
npm run build
```

### Available Scripts
- `npm start` - Start both frontend and backend in development mode
- `npm run start:app` - Start only Angular frontend (http://localhost:4200)
- `npm run start:serverdev` - Start only Node.js backend in development
- `npm run build` - Build for production
- `npm run lint` - Run code linting
- `npm run test` - Run unit and integration tests
- `npm run e2e` - Run end-to-end tests
- `npm run server:start` - Start production server with PM2
- `npm run server:stop` - Stop production server

---

## 📁 Project Structure

```
├── api/                          # Backend API (Express.js)
│   └── v1/
│       ├── controllers/          # Business logic handlers
│       ├── models/               # Sequelize database models
│       ├── services/             # Reusable service layer
│       ├── middleware/           # Auth, validation, error handling
│       └── config.json           # MySQL connection settings
│
├── src/app/                      # Frontend (Angular)
│   ├── pages/                    # Page components
│   │   ├── dashboard/            # Main dashboard
│   │   ├── admin/                # Admin management
│   │   ├── website/              # Website template editor
│   │   ├── auth/                 # Authentication pages
│   │   └── settings/             # User settings
│   ├── core/                     # Core services and models
│   │   ├── models/               # TypeScript interfaces
│   │   ├── services/             # HTTP and business logic
│   │   └── utils/                # Helper functions
│   ├── components/               # Reusable UI components
│   ├── shared/                   # Shared modules and utilities
│   ├── theme/                    # SCSS theme and styling
│   └── assets/                   # Static assets and images
│
├── e2e/                          # End-to-end tests
├── package.json                  # Dependencies and scripts
├── angular.json                  # Angular CLI configuration
└── tsconfig.json                 # TypeScript configuration
```

---

## 🎯 User Journeys

### Banner Creation Workflow
1. **Admin Setup:** Configure clients, projects, and banner templates
2. **User Selection:** Choose client → project → template
3. **Size Selection:** Select desired banner dimensions
4. **Asset Upload:** Upload creative variations (headlines, images, CTAs)
5. **Generation:** System creates all combinations automatically
6. **Export:** Download as images, GIFs, or HTML5 packages

### Website Template Creation Workflow
1. **Choose Template:** Select from template gallery
2. **Edit Template:** Use live preview editor to customize
3. **Click Elements:** Click buttons or divs in preview to select
4. **Edit Properties:** Modify text, colors, dimensions in popover editor
5. **Save Template:** Export or save customized template

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** Angular 13
- **UI Library:** Angular Material
- **Styling:** SCSS with BEM methodology
- **State Management:** RxJS Observables
- **Utilities:** CDK Drag-Drop, File Saver, JSZip

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL with Sequelize ORM
- **Security:** Helmet, CSRF Protection, JWT Authentication
- **Rate Limiting:** express-rate-limit
- **Animation:** CreateJS, GSAP

### Build & Dev Tools
- **Build:** Angular CLI, Gulpfile
- **Package Manager:** pnpm
- **Process Manager:** PM2 (production)
- **Testing:** Karma, Jasmine, Protractor
- **Linting:** TSLint

---

## 📊 Database Schema

**Core Models:**
- `Banner` - Generated ad variations
- `Template` - Reusable template layouts
- `Project` - Project container
- `Client` - Client organization
- `Component` - Template building blocks
- `Container` - Animation frame containers
- `Animation` - Animation definitions
- `Account` - User accounts
- `BannerSize` - Supported dimensions
- `BannerType` - Banner categorization

---

## 🔐 Security Features

- JWT token-based authentication
- CSRF token protection
- Rate limiting on API endpoints
- Input validation on all requests
- Secure session management
- Password hashing with bcryptjs
- Helmet middleware for HTTP headers
- CORS configuration

---

## 🚢 Deployment

**Production Build:**
```bash
npm run build
npm run server:start
```

**Environment Variables:**
- `NODE_ENV=production`
- `PORT=4000` (or custom port)
- Database credentials in `api/v1/config.json`

**Process Management:**
- Uses PM2 for production process management
- Auto-restart on crashes
- Cluster mode support

---

## 📝 API Documentation

API documentation available in `api/v1/swagger.yaml` with complete endpoint specifications.

**Main Endpoints:**
- `/api/v1/banners` - Banner operations
- `/api/v1/templates` - Template management
- `/api/v1/projects` - Project operations
- `/api/v1/clients` - Client management
- `/api/v1/components` - Component operations
- `/api/v1/accounts` - User account management

---

## 🤝 Contributing

Contributions welcome! Please follow the existing code style and add tests for new features.

---

## 📜 License

MIT License - See LICENSE file for details

---

## 💡 Future Enhancements

- Advanced template versioning
- Collaborative editing features
- A/B testing integration
- Advanced analytics and reporting
- Multi-language support
- Custom component library marketplace
- AI-powered banner optimization

---

## 📞 Support

For issues, feature requests, or questions, please open an issue on GitHub or contact the development team.

**Last Updated:** March 2026  
**Maintainers:** The Switch Development Team
