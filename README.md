# What is webGL

Believe it or not, webGL can draw only three kinds of 2D things in the area [(-1,-1),(1,1)].

* POINT: point
* LINE: set of points which are on the line between 2 points
* TRIANGLE: set of points which are inside 3 points on the plane defined by 3 points

So it is far less powerful than CANVAS or SVG, by which you can draw rectangles or circles directly.

But webGL does one thing.
When it draws a pixel, it keeps in memory additional value, z-value, which is usually used to record the distance from the viewpoint.
During drawing process, webGL checks the z-value at the pixel where it tries to draw.
If the z-value means the pixel drawn before is farther than the pixel wenGL is trying to draw, it overwrites the pixel safely.
If not, webGL will skip drawing a pixel because the pixel is positioned behind the pixel previously drawn there.
(This is quite different from HTML, which are basically drawn in order of document. This z-value check, called DEPTH_TEST, is optional. you can turn on/off as you like)

Moreover, webGL is designed to use GPU, a graphic processor that lies between CPU and a display. The CPU does not draw POINT/LINE/TRIANGLEs by itself but orders GPU to do it in his place and stead. Current GPUs can draw well over billions of triangles in a second. Gorgeous graphics in XBox/PlayStation are made possible by this technology.

So, learning webGL means learning 2 things;

* how to order GPU to draw them
* how to decompose objects into POINT/LINE/TRIANGLEs

webGL drawing is composed of two parts. One is shader program, establishing general rule of calculating where and how to draw. The other is draw call, actual execution.

## Shader program

simpleWebGL01.html is the simplest webGL sample. It shows only one triangle in the middle of the canvas.

After initialization( gl_Context() is my personal wrapper function in webgl.js. it checks whether the browser supports webGL or not, creates a canvas on which webGL draws and returns WebGLRenderingContext object), a shaderProgram is created by calling new gl.GlslProg("shader-vs", "shader-fs"). This gl.GlslProg(), my personal function, takes 2 parameters. The first param points to "vertex shader", second to "fragment shader".
Vertex shader is a job instruction about vertex(point), fragment shader is about pixel. (So fragment shader is often called pixel shader)

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

A shader is a program, as you see below, written in GLSL(OpenGL Shading Language).

Vertex shader defines attribute variables, to which data is assigned from the main program.
The shader must fill gl_Position, fixed name in webGL, which is a 4 dimensional vector.

(Why is it 4 dimensional? Common 3D coordinate (x,y,z) is denoted as (x,y,z,1) in homogeneous coordinate. What is homogeneous coordinate? Don't ask me now.)

In this case, gl_Position is filled with a composition of aVertexPosition(vec3) and 1.0.

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

As you see, shaders are general rule of how to deal with vertex/pixel in program's clothing. This pair of shaders defines how they look, shiny, shadowy, metallic, cartoon-like or however you want to paint. You can make as many shader pairs as you need.

## Draw call 

Then, we have to define the shape of a triangle.
Triangle must be defined counter-clock-wise. (No, you can define it clock-wise, but you will see the back side of the triangle) 

gl.Buffer() creates a buffer in GPU and transfers data to it.
The 2nd parameter is the size of one vertex. In this case, 3 means one vertex is expressed as triplet.
The 3rd parameter is the number of vertices. In this case, we create 1 triangle so it is 3. 

shaderProgram.bind() tells GPU to use this shaderProgram.
shaderProgram.setBuffer("aVertexPosition", triangleVertexBuffer) tells GPU to bind aVertexPosition in shader program and triangleVertexBuffer. triangleVertexBuffer.drawArrays( GL_TRIANGLES ) is a command to draw TRIANGLE.

As this triangleVertexBuffer has been created as 3 triplets, webGL assigns every 3 values to aVertexPosition, process it by the vertex shader and get a gl_Position. it repeats 3 times, gets 3 gl_Positions, and draw a triangle.

```javascript
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

## Experiment

simpleWebGL02.html draws a triangle in a more verbose way.

This vertex shader defines 3 float variables instead of 1 vec3. 3 floats plus 1.0 are bound into gl_Position(vec4).

```
<script id="shader-vs" type="x-shader/x-vertex">
attribute float aX;
attribute float aY;
attribute float aZ;
void main(void) {
  gl_Position = vec4(aX, aY, aZ, 1.0);
}
</script>
```

As you foresee, we have to create 3 buffers.

These are not triplets but "singlet". Therefore 2nd parameter is set to 1.

```javascript
  var x_of_vertices = new Float32Array( [-0.5,  0.5,  0.0] );
  var y_of_vertices = new Float32Array( [-0.5, -0.5,  0.5] );
  var z_of_vertices = new Float32Array( [-0.0,  0.0,  0.0] );
  var xVertexBuffer = new gl.Buffer( x_of_vertices, 1, 3);
  var yVertexBuffer = new gl.Buffer( y_of_vertices, 1, 3);
  var zVertexBuffer = new gl.Buffer( z_of_vertices, 1, 3);
```

Strangely enough, after setBuffer(), we can call xVertexBuffer.drawArrays(GL_TRIANGLES).

1-dimensional 3 singlets can draw a triangle? Yes, Each time a singlet of xVertexBuffer is processed, other 2 attribute variables, aY and aZ, are updated **in tandem with** aX.

```javascript
  shaderProgram.bind();
  shaderProgram.setBuffer("aX", xVertexBuffer);
  shaderProgram.setBuffer("aY", yVertexBuffer);
  shaderProgram.setBuffer("aZ", zVertexBuffer);

  xVertexBuffer.drawArrays( GL_TRIANGLES );
```

## Errors

What if you write wrongly?

1. Setting 3rd param incorrectly does not cause error.

  ```javascript
  var vertices = new Float32Array( [-0.5,  0.5,  0.0] );
  var xVertexBuffer = new gl.Buffer( vertices, 1, 2[or 4]); // No error
  ```

2. Breaking tandemness may affect or not, but does not cause error.

  ```javascript
  var xVertexBuffer = new gl.Buffer( x_of_vertices, 1, 3);
  var yVertexBuffer = new gl.Buffer( y_of_vertices, 1, 2); <== wrong. draw a triangle
  var zVertexBuffer = new gl.Buffer( z_of_vertices, 1, 3);
  ```
  but...

  ```javascript
  var xVertexBuffer = new gl.Buffer( x_of_vertices, 1, 3);
  var yVertexBuffer = new gl.Buffer( y_of_vertices, 1, 3);
  var zVertexBuffer = new gl.Buffer( z_of_vertices, 1, 2); <== wrong. not draw a triangle
  ```
  Almost unpredictable for me.

3. Insufficient data cause error *GL_INVALID_OPERATION : glDrawArrays: attempt to access out of range vertices in attribute*

  ```javascript
  var x_of_vertices = new Float32Array( [-0.5,  0.5,  0.0] );
  var y_of_vertices = new Float32Array( [-0.5, -0.5,  0.5] );
  var z_of_vertices = new Float32Array( [-0.0,  0.0] ); <== this cause error at draw call
  var xVertexBuffer = new gl.Buffer( x_of_vertices, 1, 3);
  var yVertexBuffer = new gl.Buffer( y_of_vertices, 1, 3);
  var zVertexBuffer = new gl.Buffer( z_of_vertices, 1, 3);
  ```

In webGL, you have to write at least 3 programs (2 shaders and main javascript).
Sometimes it is nerve-wracking to find and fix bugs. It is advisable to test more frequently than usual.

#### reference 

[WebGL 1.0 API Quick Reference](https://www.khronos.org/files/webgl/webgl-reference-card-1_0.pdf)

