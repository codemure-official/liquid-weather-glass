# Liquid Glass Weather

A responsive weather interface concept by [Codemure](https://www.codemure.com). It explores a tactile glass card with real-time weather-driven rain, fog, frost, heat, and wind effects.

Built with React, TypeScript, Vite, Three.js, React Three Fiber, and custom GLSL shaders. This is a visual concept and code sample, not a full weather product.

## Run locally

Requirements: Node.js 20.19+ or 22.12+, and npm.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. No API key or environment file is needed for the included demo.

For a production build:

```bash
npm run build
npm run preview
```

The build output is in `dist/`. The project is a client-side app and can be hosted on a static site host.

## Explore the concept

- Drag or tilt the card to interact with the glass.
- Press **D** to open the demo controls. On touch screens, double-tap the top-right corner, or open the page with `?demo`.
- Choose a preset or adjust the sliders to explore the effects. Select **Live** to return to the weather-based state.
- Add `?mock` to show the built-in London demo without requesting live weather. URL parameters such as `?rain=0.5&fog=0.3&wind=0.6` set effect targets for a shareable view.

WebGL2 powers the animated scene. Browsers without WebGL2 show a static version of the weather card.

## Weather data and privacy

By default, the browser may ask for location permission. If permission is unavailable or declined, the app uses London. It sends coordinates to [Open-Meteo](https://open-meteo.com/) for current conditions and, when device location is available, to [BigDataCloud](https://www.bigdatacloud.com/) for a city name. The most recent weather response and location are saved in the browser's local storage. The cache is treated as fresh for 10 minutes and may be used later if a live request fails. If no data is available, the app shows demo weather.

Open-Meteo's [free API terms](https://open-meteo.com/en/terms) restrict its use to noncommercial purposes. If you adapt this project for a commercial product or promotion, arrange suitable weather API access and review the providers' terms. Weather data is credited to Open-Meteo under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); this interface transforms the data into visual effects and simplified condition labels.

## Use the code

You are welcome to study, fork, modify, and use this concept under the [MIT license](LICENSE). Keep the license notice with copies of the code. Codemure is the creator of this concept; the license does not grant rights to use Codemure's name or branding as your own.

Made by [Codemure](https://www.codemure.com).
