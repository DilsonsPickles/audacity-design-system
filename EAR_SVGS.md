# Label Ear SVG Paths

These SVG paths are used for the "ears" on label markers.

## Left Ear
```
M0.723608 1.44722L7 14V0H1.61827C0.874886 0 0.391157 0.782314 0.723608 1.44722Z
```

## Right Ear
```
M6.27639 1.44722L0 14V0H5.38173C6.12511 0 6.60884 0.782314 6.27639 1.44722Z
```

## SVG Container Properties
- Width: 7px
- Height: 14px
- ViewBox: "0 0 7 14"
- Fill: none (paths have their own fills)

## Usage Example
```tsx
<svg
  width="7"
  height="14"
  viewBox="0 0 7 14"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    d="M0.723608 1.44722L7 14V0H1.61827C0.874886 0 0.391157 0.782314 0.723608 1.44722Z"
    fill="#yourColor"
  />
</svg>
```
