# AI Global Trade Intelligence Frontend

Production-ready React + Vite frontend for the AI-powered Global Trade Intelligence Platform.

## Stack
- React (Vite)
- TailwindCSS
- Axios
- React Hook Form
- Framer Motion
- Mapbox GL
- Recharts

## Setup
1. Install dependencies
```bash
npm install
```
2. Create your environment file
```bash
cp .env.example .env
```
3. Update `.env` values
- `VITE_API_BASE_URL`: FastAPI backend base URL
- `VITE_MAPBOX_TOKEN`: Mapbox public token for map rendering

4. Start development server
```bash
npm run dev
```

## Mapbox Setup
- Create a Mapbox account and generate a public access token.
- Add the token to `.env` as `VITE_MAPBOX_TOKEN`.
- The map will render arcs and nodes based on `map_flow` data from the backend.

## API Contract
- `POST /analyze`
- `POST /recalculate`
- `POST /generate-report`

See the backend contract in the master prompt for request/response payloads.

## Project Structure
```
src/
  pages/
    Dashboard.jsx
    NewAnalysis.jsx
    Results.jsx
  components/
    ProductInputForm.jsx
    MaterialEditor.jsx
    MapVisualization.jsx
    DutyBreakdown.jsx
    RiskScoreCard.jsx
    SummaryCard.jsx
    LoadingSpinner.jsx
    ErrorState.jsx
  services/api.js
  hooks/useAnalysis.js
  context/AnalysisContext.jsx
  utils/validators.js
  constants/countries.js
```
# Trademasterfinalfinal
