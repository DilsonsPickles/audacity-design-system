/**
 * The REAL build's label/clip palette — theme keys clip_color_1..9 from
 * au4's src/app/configs/light.cfg + dark.cfg (identical in both themes),
 * applied to labels via LabelItem.qml as white-blends per state. Mapped
 * onto the sandbox's track color names (build "Turquoise" = our "teal").
 * Grounding the sandbox in these values so strap redesigns transfer 1:1.
 */
export const BUILD_LABEL_COLORS: Record<string, string> = {
  blue: '#66A3FF',      // clip_color_1
  violet: '#9996FC',    // clip_color_2
  magenta: '#DA8CCC',   // clip_color_3
  red: '#F08080',       // clip_color_4
  orange: '#FF9E65',    // clip_color_5
  yellow: '#E8C050',    // clip_color_6
  green: '#74BE59',     // clip_color_7
  teal: '#34B494',      // clip_color_8 (build: "Turquoise")
  cyan: '#48BECF',      // clip_color_9
};
