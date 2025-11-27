# SonicPlayground
## 0. Webpage, GitHub, Demonstration Video Links
### [SonicPlayground Webpage](https://eun5077.github.io/SonicPlayground/)

### [GitHub Repository](https://github.com/Eun5077/SonicPlayground.git)

### [Demonstration Video](https://youtu.be/3JudBmLbCNg)

### [Demonstration Score](https://drive.google.com/file/d/11kltLEjc6w07fcHzxlbV7fIk8nhe2zxQ/view?usp=sharing)

## 1.	SonicPlayground
This project connects the relationship between action, vision, and sound through the integrated mediums of drawing and music. Whereas traditional notation presents a pre-composed structure that performers reinterpret, SonicPlayground explores a system in which the act of drawing itself becomes the act of composing. When the user creates shapes or traces lines on the screen, these physical gestures are directly transformed into musical parameters such as pitch, rhythm, and timbre.

The sounds generated within SonicPlayground are not random; they follow defined musical rules within a rule-based compositional framework. Each mode corresponds to its own musical logic, mapping the principles of melody, rhythm, and phrasing from traditional notation onto visual structures. Through this system, the user experiences the process of “drawing music,” gaining the ability to create and reshape sound intuitively. SonicPlayground thus offers a new form of musical interaction in which anyone can actively participate in shaping the sonic outcome.

## 2.	System Overview and Functional Details
SonicPlayground is a web-based interactive music-generation system that combines real-time graphics rendered through the HTML Canvas with the audio engine of Tone.js. Every element drawn on the screen influences musical parameters such as timbre, rhythm, pitch, volume, and panning, creating immediate feedback between the user’s gestures and the resulting sound. Each visual element functions like an independent musical instrument, forming layered textures that allow the user to compose music as though they were drawing on the canvas.

### 🔷 Polygon Mode
    • Click on the screen to place multiple points, and press Enter to generate a polygon.
    • A playhead continuously moves along the outline of the polygon.
    • Sound is triggered each time the playhead reaches a vertex.
    • The vertical position of the polygon determines pitch, while the horizontal position controls stereo panning.
### ⚽ Ball Mode
    • Clicking the screen creates a ball of the currently selected type.
    • Balls produce sound whenever they collide with walls or other obstacles; the collision point determines pitch and panning.
    • Each ball type has its own timbre.
    • The ADSR Envelope panel allows users to customize the sound of each ball type.
### 🎨 Brush Mode
    • Dragging the mouse paints color onto the canvas.
    • Areas covered with brush strokes slow down the movement of both the playhead and the balls.
    • Repeated brush strokes intensify the color and increase the slowing effect.
### ➡️ Arrow Mode
    • Dragging on the screen creates a straight arrow connecting the drag’s start and end points.
    • Balls reflect and change direction upon colliding with the arrow.
    • Each arrow disappears automatically after three seconds.
    • The arrow’s horizontal and vertical displacement controls overall volume and pitch, respectively.
### ⚪️🔺🟦 Shape Mode
    • Users can insert circles, triangles, or rectangles by selecting a shape and dragging to set its size.
    • These shapes do not generate sound; instead, they act as physical obstacles that block or reflect the balls.
### 🧽 Eraser
    • Dragging with the eraser removes any objects within the selected area.
    • When a shape or ball is erased, the sound associated with that object is immediately removed as well.
### 🎛️ Reverb
    • The right-side panel allows users to adjust Decay, Pre-Delay, and Wet values to shape the character and amount of reverb.
    • Reverb settings apply globally and affect all sounds generated within the system.

