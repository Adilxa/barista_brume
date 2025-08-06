# Next.js + shadcn/ui + TanStack Query + Jotai Template

A modern, production-ready Next.js template that combines the power of **shadcn/ui** components, **TanStack Query** for server state management, and **Jotai** for client state management. This template provides a solid foundation for building scalable React applications with TypeScript.

## 🚀 Features

### **UI & Styling**
- **shadcn/ui** - Beautiful, accessible, and customizable components
- **Tailwind CSS v4** - Utility-first CSS framework with the latest features
- **Lucide React** - Beautiful & consistent icon toolkit
- **Class Variance Authority** - Type-safe component variants
- **Tailwind Merge** - Efficiently merge Tailwind CSS classes

### **State Management**
- **TanStack Query v5** - Powerful data fetching, caching, and synchronization
- **Jotai** - Atomic state management for client-side state
- **Axios** - Promise-based HTTP client for API requests

### **Development Experience**
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **ESLint** - Code linting with TanStack Query plugin
- **Turbopack** - Fast bundler for development
- **React Query DevTools** - Development tools for debugging queries

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── config/            # Configuration files
│   │   ├── api.ts         # API configuration
│   │   └── queryClient.ts # TanStack Query client config
│   ├── hooks/             # Custom React hooks
│   ├── providers/         # React providers
│   ├── services/          # API services and hooks
│   │   ├── apis/          # API functions
│   │   ├── hooks/         # Query hooks
│   │   └── interfaces/    # TypeScript interfaces
│   ├── store/             # Jotai atoms
│   │   └── atoms/         # State atoms
│   ├── types/             # TypeScript type definitions
│   └── utils.ts           # Utility functions
└── components.json        # shadcn/ui configuration
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm/yarn

### Installation

1. **Clone the template**
   ```bash
   git clone <repository-url>
   cd next-shadcn-tanstakquery
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Start the development server**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Key Concepts

### **TanStack Query Setup**
The template includes a pre-configured TanStack Query client with optimized defaults:
- 5-minute stale time for queries
- Disabled refetch on window focus
- Development tools enabled

### **shadcn/ui Integration**
- Pre-configured with the "new-york" style
- TypeScript support enabled
- Lucide React icons
- Customizable component variants

### **State Management Pattern**
- **TanStack Query**: Server state (API data, caching, synchronization)
- **Jotai**: Client state (UI state, form state, local preferences)

## 📚 Usage Examples

### Adding a new shadcn/ui component
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
```

### Creating a new API service
```typescript
// lib/services/apis/user.api.ts
import { api } from '@/lib/config/api';

export const userApi = {
  getUsers: () => api.get('/users'),
  getUser: (id: string) => api.get(`/users/${id}`),
  createUser: (data: CreateUserData) => api.post('/users', data),
};
```

### Creating a query hook
```typescript
// lib/services/hooks/useUsers.ts
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../apis/user.api';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
  });
};
```

### Using Jotai for client state
```typescript
// lib/store/atoms/ui.atom.ts
import { atom } from 'jotai';

export const sidebarOpenAtom = atom(false);
export const themeAtom = atom<'light' | 'dark'>('light');
```

## 🔧 Configuration

### TanStack Query
Modify `lib/config/queryClient.ts` to adjust query defaults:
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});
```

### shadcn/ui
Update `components.json` to customize the component library:
```json
{
  "style": "new-york",
  "baseColor": "neutral",
  "cssVariables": true
}
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import the project in Vercel
3. Deploy automatically

### Other Platforms
```bash
# Build the application
pnpm build

# Start the production server
pnpm start
```

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Jotai Documentation](https://jotai.org)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

This template is designed to be a starting point. Feel free to:
- Add new components
- Modify the configuration
- Add additional features
- Submit issues and pull requests

## 📄 License

This template is open source and available under the [MIT License](LICENSE).
