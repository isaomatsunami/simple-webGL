# What is webGL

Believe it or not, webGL can draw only three kinds of 2D things in the area [(-1,-1),(1,1)].

* POINT: point
* LINE: line between 2 points
* TRIANGLE: face inside 3 points

So it is far less powerful than CANVAS or SVG, by which you can draw rectangles or circles directly.

But webGL does one thing.
When it draws a pixel, it keeps in memory additional value, z-value, which usually is used to record the distance from the viewpoint.
During drawing process, webGL checks the z-value at the pixel where it trys to draw.
If the z-value means the pixel drawn before is farther than the pixel wenGL is trying to draw, it overwrites the pixel safely.
If not, webGL will skip drawing a pixel because the pixel is positioned behind the pixel previously drawn there.
(This is quite different from HTML, which are basically drawn in order of document)
This z-value check, called DEPTH_TEST, is optional. you can turn on/off as you like.

Moreover, webGL is designed to use GPU, a graphic processor that lies between CPU and a display. The CPU does not draw POINT/LINE/TRIANGLEs by itself but orders GPU to do it in his place and stead. Current GPUs can draw well over billions of  triangles in a second. Gorgeous graphics in XBox/PlayStation are made by this technology.

So, learning webGL means;

* how to decompose objects into POINT/LINE/TRIANGLEs
* how to order GPU to draw them

## Shader program

simpleWebGL01.html shows only one triangle in the middle of the canvas.

After initialization, shaderProgram is created by calling new gl.GlslProg("shader-vs", "shader-fs").
GlslProg takes 2 parameters. The first param points to "vertex shader", second to "fragment shader".
vertex shader is a job instruction about vertex(point), fragment shader is about pixel.

```javascript
  var width = 1000, height = 500, nearFrustum = 0.1, farFrustum = 100;  
  // intialise webGL
  var gl = gl_Context( document.getElementById("chart"), width, height);
  if( gl.failed ) {
    console.log("Could not initialise WebGL, sorry :-(");
    return;
  };

  // shaderProgram is a kind of job order
  var shaderProgram = new gl.GlslProg("shader-vs", "shader-fs");
```

2 shaders are written in GLSL(OpenGL Shading Language).

Vertex shader defines attribute variables, which receive data from javascript.
The shader must fill gl_Position, fixed name in webGL, which is 4 dimensional vector.

(Why is it 4 dimensional? Common 3D coordinate (x,y,z) is denoted as (x,y,z,1) in homogeneous coordinate. What is homogeneous coordinate? Don't ask me now.)

In this case, gl_Position is filled with vec4 that is mixture of aVertexPosition(vec3) and 1.0.

```
<script id="shader-vs" type="x-shader/x-vertex">
attribute vec3 aVertexPosition;
void main(void) {
  gl_Position = vec4(aVertexPosition, 1.0);
}
</script>
```

When webGL is ordered to draw POINT/LINE/TRIANGLEs, At first, it processes every vertex by using this vertex shader and get the result, gl_Position. Next, it calculates which pixels need to be painted; In case of LINE, for example, pixels which lies between 2 gl_Positions are picked up.

For each pixel, webGL calls the fragment shader. it must fill gl_FragColor, fixed name, which is vec4 (r, g, b, alpha). r/g/b/alpha is value in [0,1].

In this case, gl_FragColor is (1,1,1,1), perfect white.

```
<script id="shader-fs" type="x-shader/x-fragment">
precision mediump float;
void main(void) {
  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
</script>
```

When webGL gets gl_FragColor, (if gl.DEPTH_TEST is enabled) it compares the z-value of the pixel it is going to paint (new pixel) and the z-value of the pixel in GPU memory (old pixel). If the new pixel is judged to lie between the origin (viewpoint) and the old pixel, webGL paints the new pixel and update its z-value.

As you see, shaders are general rule of how to deal with vertex/pixel in program's clothing. This pair of shaders defines how they look, shiny, shadowy, metallic, cartoon-like or whatever you want. You can make as many shader pairs as you need.

## Draw call 


```javascript
  // vertices is series of triplets(x,y,z)
  var vertices = new Float32Array( [-0.5,-0.5,0.0,  0.5,-0.5,0.0,  0.0,0.5,0.0] );
  // reserve memory in GPU for vertices, telling these are triplets by first 3, number of triplets by second 3.
  var triangleVertexBuffer = new gl.Buffer( vertices, 3, 3);

  gl.clearColor(0.0, 0.0, 0.0, 1.0); // draw the canvas in black
  gl.enable(gl.DEPTH_TEST); // tell GPU to check z-value
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight); // size of canvas
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // refresh your brain

  shaderProgram.bind(); // tell GPU to follow this job order
  // send triangleVertexBuffer to GPU
  shaderProgram.setBuffer("aVertexPosition", triangleVertexBuffer);
  // order to draw it
  triangleVertexBuffer.drawArrays( GL_TRIANGLES );
```



