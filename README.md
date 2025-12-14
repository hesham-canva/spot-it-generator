# Spot It Generator

Create custom Spot It (Dobble) card game printouts with AI-generated images.

## Features

- **AI-Powered Symbol Generation**: Enter a theme and GPT-4.1 generates 57 unique symbol descriptions
- **AI Image Generation**: Uses Leonardo.ai Nano Banana model to create high-quality symbol images
- **Mathematically Correct**: Uses projective plane algorithm to ensure any two cards share exactly one symbol
- **Print Ready**: Browser print or PDF download with optimized layouts

## Tech Stack

- **Vite** - Fast development server and build tool
- **Tailwind CSS** - Utility-first CSS framework
- **jsPDF** - PDF generation
- **OpenAI API** - GPT-4.1 for text generation
- **Leonardo.ai API** - Nano Banana model (gemini-2.5-flash-image) for image generation

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key with access to `gpt-4.1`
- Leonardo.ai API key

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens the app at http://localhost:5173

### Build

```bash
npm run build
```

Creates production build in `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## How to Use

1. Enter your OpenAI API key (for generating symbol descriptions)
2. Enter your Leonardo.ai API key (for generating images)
3. Enter a theme (e.g., "animals", "space", "food") or leave blank for mixed
4. Click "Generate 57 Symbols"
5. Review/edit descriptions if needed
6. Click "Generate Images" and wait for completion
7. Download PDF or print from browser

## Getting API Keys

### OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com/api-keys)
2. Create a new API key
3. Make sure you have access to GPT-4.1

### Leonardo.ai API Key

1. Go to [app.leonardo.ai/settings](https://app.leonardo.ai/settings)
2. Navigate to the API section
3. Generate or copy your API key

## Math Behind Spot It

The game uses a finite projective plane of order 7:

- 57 unique symbols
- 57 unique cards
- 8 symbols per card
- Any two cards share exactly one symbol

## Project Structure

```
spot-it/
├── index.html              # Main HTML file
├── src/
│   ├── main.js             # Application entry point
│   ├── algorithm.js        # Card generation algorithm
│   ├── openai.js           # OpenAI + Leonardo API integration
│   ├── pdf.js              # PDF generation
│   └── styles.css          # Tailwind CSS entry
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
└── postcss.config.js       # PostCSS configuration
```

## Cost Estimate

Approximate API costs:

- OpenAI (text generation): ~$0.01 (one GPT-4.1 call)
- Leonardo.ai (images): Varies by plan - check [leonardo.ai/pricing](https://leonardo.ai/pricing)

## Privacy

All data stays in your browser:

- API keys stored in localStorage
- Generated images cached in localStorage
- Nothing sent to any server except OpenAI and Leonardo.ai APIs

## License

MIT
