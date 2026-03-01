# Web UI Rules

## Design Direction

1. Combine soft neumorphism and premium Web3-inspired aesthetics when compatible with the product context.
2. Prefer monochromatic palettes with subtle effects and restrained shadows.
3. Use card-based layouts with depth and understated backgrounds.
4. Separate sections using spacing, elevation, and surface contrast instead of heavy borders.
5. Keep backgrounds full-width and center main content on large screens.
6. Target secure, professional, institutional-grade visual perception.

## Implementation Rules

1. Use design tokens and configured font families from project theme config files.
2. Update project color config when the active design brief changes.
3. Support both themes using `dark:` patterns when Tailwind is in use.
4. Include the project theme switch component in navigation when one exists.
5. Avoid hardcoded hex strings or pixel literals when project utilities/tokens provide equivalents.
6. Split reusable or complex UI into dedicated components.
7. Keep sample/mock data in separate data modules, not inline in view components.

## Adaptation Rule

If project constraints conflict with these rules, keep product consistency first and adapt this guidance to the existing system rather than forcing a redesign.
