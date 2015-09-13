gl_Context = function(targetElement, width, height, options){
    var _gl = null; // officailly WebGLRenderingContext
    this.failed = true;
    if( (!window.CanvasRenderingContext2D) && (!window.WebGLRenderingContext) ) return false;
    var canvas = this.canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    try {
        _gl = canvas.getContext("webgl", options) || canvas.getContext("experimental-webgl", options);
        _gl.viewportWidth = width;
        _gl.viewportHeight = height;
    } catch (e) {   // webGLに対応しない
        console.log('canvas.webgl not supported');
        return false;
    }
    if (!_gl) {  // 初期化失敗。メモリー不足など？
        console.log('possibly out of memory?');
        return false;
    }
    this.failed = false;
    /* 拡張機能がないと中途半端で終わってしまうから絶対に使わないこと	
    var ext = _gl.getExtension('ANGLE_instanced_arrays');
    if(ext == null){
        console.log('ANGLE_instanced_arrays not supported');
        return false;
    }
    _gl.floatTexture = _gl.getExtension( "OES_texture_float" );
    if(_gl.floatTexture == null){
        console.log('OES_texture_float not supported');
        return false;
    }
    */
    _gl.MAX_TEXTURE_SIZE = _gl.getParameter(_gl.MAX_TEXTURE_SIZE);
    // 最初の一瞬の色塗り
    _gl.clearColor(1,1,1,1); // white
    _gl.clearDepth(1);
    _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

    targetElement.appendChild(canvas);

    window.requestAnimation = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function( callback, element) { window.setTimeout(callback, 1000/60);};
    _gl.resize = function(w,h){
        canvas.width = _gl.viewportWidth = w;
        canvas.height = _gl.viewportHeight = h;
    };
    _gl.maxTextureSize = function(){
    	return _gl.getParameter(_gl.MAX_TEXTURE_SIZE);
    };
    _gl.GlslProg = function( vertexShaderID, fragmentShaderID ){
        // 必ずnewで呼ぶこと
        this.attributes = {};
        this.uniforms = {};
        // create vertex shader
        var shaderScript = document.getElementById(vertexShaderID);
        if (shaderScript.type != "x-shader/x-vertex"){
            console.log("vertex shader type is not x-shader/x-vertex");
            return null;
        }
        var vs = this.vertextShader = _gl.createShader(_gl.VERTEX_SHADER);
        var src = shaderScript.firstChild.textContent;
        var that = this;
        src.split("\n").forEach(function(line){
            var items = line.trim().split(/\s+/);
            if(items.length != 3) return;
            var name = items[2].replace(";","");
            switch(items[0]){
                case "attribute":
                    that.attributes[name] = {type:items[1], location:null};
                    break;
                case "uniform":
                    that.uniforms[name] = {type:items[1], location:null};
                    break;
                default:
            }
        });
        _gl.shaderSource(vs, src);
        _gl.compileShader(vs);
        if (!_gl.getShaderParameter(vs, _gl.COMPILE_STATUS)) {
            console.log("vertex shader:", _gl.getShaderInfoLog(vs));
            return null;
        }
        // create fragment shader
        shaderScript = document.getElementById(fragmentShaderID);
        if (shaderScript.type != "x-shader/x-fragment"){
            console.log("vertex shader type is not x-shader/x-fragment");
            return null;
        }
        var fs = this.fragmentShader = _gl.createShader(_gl.FRAGMENT_SHADER);
        src = shaderScript.firstChild.textContent;
        src.split("\n").forEach(function(line){
            var items = line.trim().split(/\s+/);
            if(items.length != 3) return;
            var name = items[2].replace(";","");
            switch(items[0]){
                case "attribute":
                    that.attributes[name] = {type:items[1], location:null};
                    break;
                case "uniform":
                    that.uniforms[name] = {type:items[1], location:null};
                    break;
                default:
            }
        });
        _gl.shaderSource(fs, src);
        _gl.compileShader(fs);
        if (!_gl.getShaderParameter(fs, _gl.COMPILE_STATUS)) {
            console.log("fragment shader:", _gl.getShaderInfoLog(fs));
            return null;
        }
        var sp = this.shaderProgram = _gl.createProgram();
        _gl.attachShader(sp, vs);
        _gl.attachShader(sp, fs);
        _gl.linkProgram(sp);
        if (!_gl.getProgramParameter(sp, _gl.LINK_STATUS)) {
            console.log("Could not initialize shaders");
            return false;
        }
        //
        var keys = Object.keys(this.attributes);
        for (var i = 0, n = keys.length; i < n; i++){
            this.attributes[keys[i]].location =  _gl.getAttribLocation(sp, keys[i])
        }
        keys = Object.keys(this.uniforms);
        for (var i = 0, n = keys.length; i < n; i++){
            this.uniforms[keys[i]].location =  _gl.getUniformLocation(sp, keys[i]);
        }
        var gl = _gl;
        GL_TRIANGLES = _gl.TRIANGLES;
        GL_TRIANGLE_STRIP = _gl.TRIANGLE_STRIP;
        GL_LINES = _gl.LINES;
        GL_POINTS = _gl.POINTS;

        this.bind = function(){gl.useProgram(this.shaderProgram);};
        this.unbind = function(){gl.useProgram(null);};
        this.setUniform = function(variable, a1, a2, a3, a4){
            if(!this.uniforms.hasOwnProperty(variable)){
                console.log("No uniform variable in shaders: ", variable);
            }
            var v = this.uniforms[variable];
            switch(v.type){
                case "vec2":
                    gl.uniform2f(v.location, a1, a2);break;
                case "ivec2":
                    gl.uniform2i(v.location, a1, a2);break;
                case "vec3":
                    gl.uniform3f(v.location, a1, a2, a3);break;
                case "ivec3":
                    gl.uniform3i(v.location, a1, a2, a3);break;
                case "vec4":
                    gl.uniform4f(v.location, a1, a2, a3, a4);break;
                case "ivec4":
                    gl.uniform4i(v.location, a1, a2, a3, a4);break;
                case "float":
                    gl.uniform1f(v.location, a1);break;
                case "int":
                    gl.uniform1i(v.location, a1);break;
                case "bool":
                    gl.uniform1i(v.location, a1);break;
                case "mat4":
                    gl.uniformMatrix4fv(v.location, gl.FALSE, a1);break;
                case "mat3":
                    gl.uniformMatrix3fv(v.location, gl.FALSE, a1);break;
                case "sampler2D":
                    gl.uniform1i(v.location, a1);break;
                default:
                    console.log("Unexpected type uniform");break;
            }
        };
        this.setBuffer = function(variable, bObj){
            if(!this.attributes.hasOwnProperty(variable)){
                console.log("No attribute variable in shaders", variable, bObj, this.attributes);
            }
            var v = this.attributes[variable];
            gl.bindBuffer(bObj.type, bObj.buffer);
            gl.enableVertexAttribArray(v.location);
            var stride = 0, offset = 0;
            // Specifies the data formats and locations of attributes in a vertex attributes array.
            gl.vertexAttribPointer(v.location, bObj.size, gl.FLOAT, bObj.Normalized, stride, offset);
        };
        this.setTexture = function(variable, txtObj){
            if(!this.uniforms.hasOwnProperty(variable)){
                console.log("No uniform variable in shaders");
            }
            var v = this.uniforms[variable];
            if(v.type != "sampler2D") {
                console.log("Not sampler2D variable");                
            }
            gl.activeTexture(gl.TEXTURE0 + txtObj.offset);
            gl.bindTexture(gl.TEXTURE_2D, txtObj.texture);	// 送らないオプションもある？
            gl.uniform1i(v.location, txtObj.offset); // locationがsamplerなら、TEXTURE offset
        };
        return this;
    };
    _gl.Buffer = function( typedArr, itemsize, num, targetType, usage ){
        // 必ずnewで呼ぶこと
        var gl = _gl;
        this.type = targetType || gl.ARRAY_BUFFER; // gl.ELEMENT_ARRAY_BUFFER,
        usage = usage || gl.STATIC_DRAW;           // gl.STREAM_DRAW
        this.typedArr = typedArr;
        this.buffer = gl.createBuffer();
        gl.bindBuffer(this.type, this.buffer);
        gl.bufferData(this.type, typedArr, usage);
        this.size = itemsize; // 1,2,3,4 default = 4
        this.num = num; // item count. therefore, this.size * this.num equals typedArr.length
        this.Normalized = gl.FALSE;
        this.bind = function(){
            gl.bindBuffer(this.type, this.buffer);
        };
        this.update = function(typedArr, itemsize, num){
            this.typedArr = typedArr || this.typedArr;
            this.size = itemsize || this.size;
            this.num = num || this.num;
            gl.bindBuffer(this.type, this.buffer);
            gl.bufferData(this.type, this.typedArr, usage);
        };
        this.drawElements = function(mode, _first, _count){
            // 16bit unsignedしか受け付けない
            var first = (_first == undefined) ? 0 : _first;
            var count = (_count == undefined) ? this.num : _count;
            if(this.type != gl.ELEMENT_ARRAY_BUFFER){
                console.log("this is not ELEMENT_ARRAY_BUFFER");return;
            }
            gl.bindBuffer(this.type, this.buffer);
            gl.drawElements(mode, count, gl.UNSIGNED_SHORT, first);
        };
        this.drawArrays = function(mode, _first, _count){
            var first = (_first == undefined) ? 0 : _first;//first element to render in the array of vector points
            var count = (_count == undefined) ? this.num : _count;//number of vector points to render. For example, a triangle would be 3.
            if(this.type != gl.ARRAY_BUFFER){
                console.log("this is not ARRAY_BUFFER");return;
            }
            gl.bindBuffer(this.type, this.buffer);
            // _gl.vertexAttribPointer(v.location, bObj.size, _gl.FLOAT, bObj.Normalized, stride, offset);
            gl.drawArrays(mode, first, count);
        };
        return this;
    };
    _gl.FrameBuffer = function( width, height ){
        var gl = _gl;
    	this.buffer = gl.createFramebuffer();
    	this.width = width || 512;
    	this.height = height || 512;
    	// Associates a WebGLFramebuffer object with the gl.FRAMEBUFFER bind target.
    	gl.bindFramebuffer( gl.FRAMEBUFFER, this.buffer );

        var texture = this.texture = gl.createTexture(); // 色情報を保存するテキスチャー
        var offset  = this.offset  = textureOffset();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);        // gl.generateMipmap(gl.TEXTURE_2D);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); // 最後のpixelsが未定

        this.renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
        // WebGLRenderingContext.renderbufferStorage(target, internalformat, width, height)
        // Creates or replaces the data store for the currently bound WebGLRenderbuffer object
        // 深度情報を保存するように設定する
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);

		// WebGLRenderingContext.framebufferTexture2D(target, attachment, textarget, texture, level)
		// Attaches a texture to a WebGLFramebuffer object.
		// atachment = gl.COLOR_ATTACHMENT0/gl.DEPTH_ATTACHMENT/gl.STENCIL_ATTACHMENT/gl.DEPTH_STENCIL_ATTACHEMENT
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        // WebGLRenderingContext.framebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer)
        // Attaches a WebGLRenderbuffer object as a logical buffer to the currently bound WebGLFramebuffer object
        // atachment = gl.COLOR_ATTACHMENT0/gl.DEPTH_ATTACHMENT/gl.STENCIL_ATTACHEMENT/gl.DEPTH_STENCIL_ATTACHEMENT
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderbuffer);
        // 設定が終了したのでデフォルトに戻す
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.createMipmap = function(){
        	gl.bindTexture(gl.TEXTURE_2D, this.texture);
        	gl.generateMipmap(gl.TEXTURE_2D);
        	gl.bindTexture(gl.TEXTURE_2D, null);
        };
        this.bind = function(){gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffer);};
        this.unbind = function(){gl.bindFramebuffer(gl.FRAMEBUFFER, null);};
        this.readPixel = function(_x,_y){
        	var res = new Uint8Array(4);
        	gl.bindFramebuffer( gl.FRAMEBUFFER, this.buffer );
        	// readPixelsはactiveFrameBufferのcolorBufferから読み出す
			gl.readPixels( _x, _y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, res );
			return res;
        };
    };
    var textureOffset = (function(){
        var i = -1, limit = _gl.getParameter(_gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
        return function(){
            if(i > limit - 2) console.log("number of texture exceeds limit ?");
            return i += 1;
        }
    })();

    var isPowerOf2 = function(n){return (n & (n-1)) == 0;};

    _gl.Texture = function( ImgOrCanvas, alpha, useMipmap, filter_min, filter_mag, wrap ){
        // 必ずnewで呼ぶこと
        var gl = this.gl = _gl;
        var txt = this.texture = gl.createTexture(gl.TEXTURE_2D);
        var offset = this.offset = textureOffset();
        alpha = (alpha == undefined) ? _gl.RGBA : alpha; // gl.RGB gl.RGBA gl.ALPHA gl.LUMINANCE gl.LUMINANCE_ALPHA
        useMipmap = (useMipmap == undefined) ? true : useMipmap;
        filter_min = (filter_min == undefined) ? gl.LINEAR_MIPMAP_NEAREST : filter_min;
        filter_mag = (filter_mag == undefined) ? gl.LINEAR : filter_mag;
        wrap = (wrap == undefined) ? gl.CLAMP_TO_EDGE : wrap; // _gl.REPEAT or _gl.MIRRORED_REPEAT;
        this.img = ImgOrCanvas;
        this.update = function(img){
        	if( !img ) return;
            this.img = img;
        	var gl = this.gl;
        	gl.bindTexture( gl.TEXTURE_2D, txt);
        	gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true);
        	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter_min);
        	if( (filter_min == gl.LINEAR)||(filter_min == gl.NEAREST) ) // この時しか指定できない
            	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter_mag );
        	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap );
        	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap );
        	// WebGLRenderingContext.texImage2D(target, level, internalformat,[width, height, border,] format, type, pixels)
        	// [width, height, border,]はpixelsが配列である場合だけ指定する
        	gl.texImage2D( gl.TEXTURE_2D, 0, alpha, alpha, gl.UNSIGNED_BYTE, img );
            if(useMipmap){
                gl.generateMipmap( gl.TEXTURE_2D );
            }
        	gl.bindTexture( gl.TEXTURE_2D, null );
        	return this;
        };
        this.update(this.img);
        return this;
    };
    _gl.getAspect = function(){return _gl.viewportWidth / _gl.viewportHeight;};
    _gl.getHeight = function(){return _gl.viewportHeight;};
    _gl.getWidth  = function(){return _gl.viewportWidth;};
    return _gl;
};

RemoteImage = function(url){
	var d = $.Deferred();
	var img = new Image();
	img.onload = function(){ d.resolve(img);};
	img.src = url;
	return d.promise();	
};
d3_RemoteImage = function(url, callback){
	var img = new Image();
	img.onload = function(){ callback( null, img );};
	img.src = url;
};

RemoteBinary = function(url){
	var d = $.Deferred();
	var xhr = new XMLHttpRequest();
	xhr.onload = function(e){
		if(this.status == 200) d.resolve( this.response );
	};
	xhr.open("GET", url, true);
	xhr.responseType = "arraybuffer";
	xhr.send();
	return d.promise();	
};
d3_RemoteBinary = function(url, callback){
	var xhr = new XMLHttpRequest();
	xhr.onload = function(e){
		if(this.status == 200) callback( null, this.response );
		else callback(this.status);
	};
	xhr.open("GET", url, true);
    // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#xmlhttprequest-responsetype
	xhr.responseType = "arraybuffer";
	xhr.send();
};
RemoteVideo = function(url, callback){
    var video = document.createElement("video");
    video.addEventListener("canplaythrough", function(){
        callback( null, video );
    });
    video.src = url;
};
RemoteVideoLoop = function(url, callback){
    var video = document.createElement("video");
    video.addEventListener("canplaythrough", function(){
        console.log("video:", video.videoWidth, video.videoHeight);
        video.play();
        callback( null, video );
    });
    video.addEventListener("ended", function(){
        video.play();
    });
    video.src = url;
};


function deg2rad(degrees) {return degrees * Math.PI / 180;}

cameraMatrix = function(fovy, aspect, near, far, vec3Eye, vec3Target, vec3Up){
    // unfinished
    this.fov = deg2rad( fovy || 60 ); // Vertical field of view in radians
    this.aspectRatio = aspect || 1;
    this.near = near || 0.1;
    this.far = far || 10000;
    this.eyePoint = vec3Eye || vec3.clone([0,0,-10]);
    this.centerOfInterest = vec3Target || vec3.create();
    this.worldUp = vec3Up || vec3.clone([0,1,0]);
    this.type = "perspective";

    this.pMatrix = mat4.create(); // projection matrix
    this.vMatrix = mat4.create(); // view matrix
    this.pvMatrix = mat4.create(); // pv matrix(御本尊)

    this.direction = vec3.create();
    vec3.subtract( this.direction, this.centerOfInterest, this.eyePoint );
    this.initDistance = this.distance = vec3.length(this.direction);

    this.update   = function(){
    	// updateが、eyePoint,centerOfInterest,worldUpから再計算する。
    	vec3.subtract( this.direction, this.centerOfInterest, this.eyePoint );
        this.distance = vec3.length(this.direction);
        mat4.perspective( this.pMatrix, this.fov, this.aspectRatio, this.near, this.far );
        mat4.lookAt( this.vMatrix, this.eyePoint, this.centerOfInterest, this.worldUp );
        mat4.multiply( this.pvMatrix, this.pMatrix, this.vMatrix );
    };
};
orthoCameraMatrix = function(left, right, bottom, top, near, far, vec3Eye, vec3Target, vec3Up){
    this.initLeft   = this.left   = left || -1.0;
    this.initRight  = this.right  = right || 1.0;
    this.initBottom = this.bottom =  bottom || -1.0;
    this.initTop    = this.top    = top || 1.0;
    this.near = near || 0.1;
    this.far = far || 10000;
    this.eyePoint = vec3Eye || vec3.clone([0,0,-10]);
    this.centerOfInterest = vec3Target || vec3.create();
    this.worldUp = vec3Up || vec3.clone([0,1,0]);
    this.type = "orthographic";

    this.pMatrix = mat4.create();	// projection matrix
    this.vMatrix = mat4.create();	// view matrix
    this.pvMatrix = mat4.create();	// pv matrix

    this.direction = vec3.create();
    vec3.subtract( this.direction, this.centerOfInterest, this.eyePoint );    
    this.initDistance = this.distance = vec3.length(this.direction);

	this.update = function(){
		vec3.subtract( this.direction, this.centerOfInterest, this.eyePoint );
		this.distance = vec3.length(this.direction);
		var dist = this.distance / this.initDistance;
		// orthographicの場合、距離に意味がなく、視界の拡大率に反映される
		// camera構築時の距離を基準にして視界を再計算する
		this.left   = this.initLeft * dist;
		this.right  = this.initRight * dist;
		this.bottom = this.initBottom * dist;
		this.top    = this.initTop * dist;
		mat4.ortho( this.pMatrix, this.left, this.right, this.bottom, this.top, this.near, this.far);
	    mat4.lookAt( this.vMatrix, this.eyePoint, this.centerOfInterest, this.worldUp );
	    mat4.multiply( this.pvMatrix, this.pMatrix, this.vMatrix );
	};
};

// http://glmatrix.net/docs/2.2.0/symbols/glMatrix.html
// クォータニオンは、オイラー角と違い、3D空間内の軸(x,y,z)とその軸を中心とする回転tですべての回転状態を表す。
// THREE.jsはオイラー角を、unityはクォータニオンを採用している。
// Q = (t; x,y,z)と表す。
// 逆に正規化ベクトル(x,y,z)を中心にt回転させた場合、
// 四元数    Q = (cos(t/2); x*sin(t/2), y*sin(t/2), z*sin(t/2) )
// 共役四元数 R = (cos(t/2); -1*x*sin(t/2), -1*y*sin(t/2), -1*z*sin(t/2) )
// とした場合、点(x,y,z)を四元数P(0; x,y,z)を作ると、R * P * Q = (0; X, Y, Z)となる。
// gmMatrixのquat.rotationTo(out,a,b)はaとbのベクトル間回転を表す四元数outを出す。setAxiesは視線方向、右、上を示す直交単位ベクトル

mvMatrix = function(){
	// newすること
    this.quat = quat.create();      // モデルの角度
    this.pos = vec3.create();       // モデルの位置
    this.mMatrix = mat4.create();   // model matrix
    this.nMatrix = mat3.create();   // normal matrix
    this.mvMatrix = mat4.create();  // カメラを使った場合のmodel matrix
    this.update = function(cam){
        mat4.fromRotationTranslation(this.mMatrix, this.quat, this.pos);
        if(this.parent) mat4.multiply(this.mMatrix, this.parent.update(), this.mMatrix );
        if (cam == undefined){
            mat3.normalFromMat4( this.nMatrix, this.mMatrix );
        }else{
            mat4.multiply(this.mvMatrix, cam.vMatrix, this.mMatrix)
            mat3.normalFromMat4( this.nMatrix, this.mvMatrix );
        }
    	return this.mMatrix;
	};
	this.belongs = function(obj){
		this.parent = obj;
		return this;
	};
	return this;
};


monitor = function(targetElement){
	// newで構築すること
	// 内部状態を閉じ込める
	var prevTime = Date.now(), currentFrame = 0;

	var containerDIV = document.createElement("div");
	containerDIV.style.cssText = "font-family:sans-serif;font-size:12px;width:60px;opacity:0.9;cursor:pointer;background-color:#0000ff;"
		+ "user-select: none;-moz-user-select: none;-webkit-user-select: none;-ms-user-select: none;";

	var cssLeft  = "font-weoght:bold;padding:0px 3px;text-align:left;color:yellow;";
	var cssRight = "padding:0px 5px;text-align:right;color:white;";

	var fpsDIV = document.createElement("div");
	fpsDIV.style.cssText = cssLeft
	fpsDIV.innerHTML = "FPS:";
	containerDIV.appendChild( fpsDIV );

	this.fpsText = document.createElement("div");
	this.fpsText.style.cssText = cssRight;
	this.fpsText.innerHTML = "0";
	containerDIV.appendChild( this.fpsText );

	var cameraDIV = document.createElement("div");
	cameraDIV.style.cssText = cssLeft
	cameraDIV.innerHTML = "Camera:";
	containerDIV.appendChild( cameraDIV );

	this.cameraTextX = document.createElement("div");
	this.cameraTextX.style.cssText = cssRight;
	this.cameraTextX.innerHTML = "0";
	containerDIV.appendChild( this.cameraTextX );
	this.cameraTextY = document.createElement("div");
	this.cameraTextY.style.cssText = cssRight;
	this.cameraTextY.innerHTML = "0";
	containerDIV.appendChild( this.cameraTextY );
	this.cameraTextZ = document.createElement("div");
	this.cameraTextZ.style.cssText = cssRight;
	this.cameraTextZ.innerHTML = "0";
	containerDIV.appendChild( this.cameraTextZ );

	var focusDIV = document.createElement("div");
	focusDIV.style.cssText = cssLeft
	focusDIV.innerHTML = "Focus:";
	containerDIV.appendChild( focusDIV );

	this.focusTextX = document.createElement("div");
	this.focusTextX.style.cssText = cssRight;
	this.focusTextX.innerHTML = "0";
	containerDIV.appendChild( this.focusTextX );
	this.focusTextY = document.createElement("div");
	this.focusTextY.style.cssText = cssRight;
	this.focusTextY.innerHTML = "0";
	containerDIV.appendChild( this.focusTextY );
	this.focusTextZ = document.createElement("div");
	this.focusTextZ.style.cssText = cssRight;
	this.focusTextZ.innerHTML = "0";
	containerDIV.appendChild( this.focusTextZ );

    var upDIV = document.createElement("div");
    upDIV.style.cssText = cssLeft
    upDIV.innerHTML = "Up:";
    containerDIV.appendChild( upDIV );

    this.upTextX = document.createElement("div");
    this.upTextX.style.cssText = cssRight;
    this.upTextX.innerHTML = "0";
    containerDIV.appendChild( this.upTextX );
    this.upTextY = document.createElement("div");
    this.upTextY.style.cssText = cssRight;
    this.upTextY.innerHTML = "0";
    containerDIV.appendChild( this.upTextY );
    this.upTextZ = document.createElement("div");
    this.upTextZ.style.cssText = cssRight;
    this.upTextZ.innerHTML = "0";
    containerDIV.appendChild( this.upTextZ );

	this.update = function(){
		var now = Date.now();
		++currentFrame;
		if(now - prevTime > 1000){
			var fps = Math.round( currentFrame / (now - prevTime) * 1000 );
			this.fpsText.innerHTML = fps.toString();
			prevTime = now;currentFrame = 0;
		}
	};
	this.setCamera = function(cam){
		this.cameraTextX.innerHTML = cam.eyePoint[0].toFixed(2);
		this.cameraTextY.innerHTML = cam.eyePoint[1].toFixed(2);
		this.cameraTextZ.innerHTML = cam.eyePoint[2].toFixed(2);
		this.focusTextX.innerHTML = cam.centerOfInterest[0].toFixed(2);
		this.focusTextY.innerHTML = cam.centerOfInterest[1].toFixed(2);
		this.focusTextZ.innerHTML = cam.centerOfInterest[2].toFixed(2);
        this.upTextX.innerHTML = cam.worldUp[0].toFixed(2);
        this.upTextY.innerHTML = cam.worldUp[1].toFixed(2);
        this.upTextZ.innerHTML = cam.worldUp[2].toFixed(2);
	};
	targetElement.appendChild( containerDIV );
};


interactive = function(targetEl, cam, options){
	var _ua = (function(){ return {
		Touch: typeof document.ontouchstart != "undefined",
		Pointer: typeof window.navigator.pointerEnabled != "undefined",
		MSPoniter: typeof window.navigator.msPointerEnabled != "undefined"
	}})();
	// マウス、タッチ、両方を同じコードで扱う
	var _start = _ua.Pointer ? 'pointerdown' : _ua.MSPointer ? 'MSPointerDown' : _ua.Touch ? 'touchstart' : 'mousedown';
	var _move  = _ua.Pointer ? 'pointermove' : _ua.MSPointer ? 'MSPointerMove' : _ua.Touch ? 'touchmove' : 'mousemove';
	var _end   = _ua.Pointer ? 'pointerup' : _ua.MSPointer ? 'MSPointerUp' : _ua.Touch ? 'touchend' : 'mouseup';    // Orbit Control
	// WHEEL EVENT has 3 cases
	var _wheel = 'onwheel' in document ? 'wheel' : ('onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll');
//console.log(_ua,_start,_move,_end);
	// cameraの位置と注目点を変更する
	// 注意点
	// 1) 複数のwebGL Objectが存在しても動くこと
	// 2) 画面全体を覆ってもスクロール可能なこと
	// 3) アノテーションなどが上に乗っている場合に一時消去するため、onActive/onDeactivate関数を実行する

	// 最後の_endで時間を保存する
	var lastTime = (new Date()).getTime();
	this.onActivate = function(){};		// 上書きされることを期待している
	this.onDeactivate = function(){};	// 上書きされることを期待している

	// 基本モード ORBIT（カメラが動く）、TARGET（注目点が動く）、BOTH（shiftでTARGETモードになる）
	var mode = { ORBIT: 0, TARGET: 1, BOTH: 2 };
	var defaults = {
		mode: mode.ORBIT,
		sensitivity: 0.005,
		ignoreWheel: false,	// 通常のスクロールを維持する。mouseWheel, touchMoveを無視するかどうか
		rotateAxis: null,	// 回転軸を指定する場合。nullならquaterion回転
		minDistance: 0.00001,	// 最小距離
		maxDistance: 10000.0,	// 最大距離
		throttle_time: 250.0,	// throttle時間
		zeroPlanes: [ [0,0,0,1] ],	// [a,b,c,d]で、ax+by+cz+d > 0.0 が成り立つ場合だけ許容する。正のz軸なら[0,0,1,0]
		angleLimit: null			// angleLock()した位置から許容される角度（radian）
	};

	function outOfEnvelope(){
		// 距離制限
		vec3.subtract( vec3s, cam.eyePoint, cam.centerOfInterest );
		var dis = vec3.length( vec3s );
		if (dis < s.minDistance || dis > s.maxDistance){
            return true;
        }
		// zeroPlane制限
		for(var i = 0,p = s.zeroPlanes,n = p.length;i < n;++i){
			if ( cam.eyePoint[0]*p[i][0] + cam.eyePoint[1]*p[i][1] + cam.eyePoint[2]*p[i][2] + p[i][3] < 0.0 ) return true;
		}
		// angleLimit
		if ( s.angleLimit != null ){
			var dir = vec3.subtract( vec3.create(), cam.eyePoint, cam.centerOfInterest );
			var theta = Math.acos( vec3.dot(dir, s.angle ) / vec3.length(dir) / vec3.length( s.angle ) );
			if( theta > en.angleLimit ) return true;
		}
		return false;
	};

    // optionsで上書き
	var s = this.settings = defaults;
	for(var prop in options){
		if( options.hasOwnProperty(prop) ) s[prop] = options[prop];
	}
	// throttle用タイマ
	var last_exec = new Date().getTime();

	// angleLimitがあるときはsensitivityを下げる
	if( s.angleLimit != null) s.sensitivity *= 0.05;
	function angleLock(){
		s.angle = vec3.clone( lastDirection );
	};
	this.angleLock = angleLock;

	// 変更前の状態を保持する変数
	var lastEyePoint = vec3.create(),
		lastFocus = vec3.create(),
		lastUp = vec3.create(),
		lastRight = vec3.create(),
		lastDirection = vec3.create();
	function setLastState(){
		vec3.copy( lastEyePoint, cam.eyePoint );
		vec3.copy( lastUp, cam.worldUp );
		vec3.copy( lastFocus, cam.centerOfInterest );
		vec3.subtract( lastDirection, cam.eyePoint, cam.centerOfInterest ); // Focusから見たカメラの方向
		vec3.cross( lastRight, lastUp, lastDirection );	//クロス積は右手親指(a)と人差し指(b)を180度以下で回した場合の中指方向
		vec3.normalize( lastRight, lastRight );
	};
	function rollbackState(){
		vec3.copy( cam.eyePoint, lastEyePoint );
		vec3.copy( cam.worldUp, lastUp );
		vec3.copy( cam.centerOfInterest, lastFocus );
	};
	var that = this;
	var vec3v, vec3h,	// 回転軸
		vec3s = vec3.create(), vec3t = vec3.create(), vec3u = vec3.create(), vec3v = vec3.create(), qQ = quat.create();
	var bActive = false,	// アクティブになっているか
		lastX = null, lastY = null,
		pinchWidth = 0;

    // event.screenX スクリーン上の座標
    // event.clientX(pageX) クライアント上の座標
    // event.offsetX 要素上の座標
    // var rect = targetEl.getBoundingClientRect();
    // var x = e.clientX - rect.left - targetEl.clientLeft,
    //     y = e.clientY - rect.top  - targetEl.clientTop;

	// デフォルトのズーム防止はこれしかない
	// <meta name="viewport"  content="width=device-width, initial-scale=1.0, user-scalable=no">
	// #target { -ms-touch-action : none ; /* for *IE10 */ touch-action : none ;}
	// オーバースクロール（マイナスにスクロールする例）はtouchmoveを殺すしかかない
	// document.body.addEventListener('touchmove', function(event) {event.preventDefault();}, false); 
	// 実装されているとは限らないイベント
	//   touchenter: 動いている指がDOM要素に入る。
	//   touchleave: 動いている指がDOM要素から離れる。
	//   touchcancel: タッチが中断される。

	targetEl.addEventListener( _start, onStart, false);
	function onStart(e){
		// 最後の操作から2秒経っていたら無視
		var now = (new Date()).getTime();
		if( now - lastTime > 2000){
			lastTime = (new Date()).getTime();
			bActive = false;
			return;
		}
		that.onActivate();
		var point  = e.touches ? e.touches[0] : (e || window.event);
		// iOSはclientXもpageXも同じ値で用意している
		var x = point.clientX || point.pageX || 0.0, y = point.clientY || point.pageY || 0.0;
		var rect = targetEl.getBoundingClientRect();
		lastX = x - rect.left - targetEl.clientLeft;
		lastY = y - rect.top  - targetEl.clientTop;
		bActive = true;
		// ピンチの基準になるサイズ
		if( e.touches && e.touches.length > 1 ){
			x = e.touches[1].pageX - e.touches[0].pageX;
			y = e.touches[1].pageY - e.touches[0].pageY;
			pinchWidth = Math.sqrt( x*x+y*y );
		}
		setLastState();
		// angleLock();
	}

	document.addEventListener( _move, onMove, false);
	// documentに対して設定するので、他のinteractiveからも呼び出されてしまう。
	function onMove(e){
		if( !bActive ) return;
		// throttle用
		// var now = new Date().getTime();
		// if( now - last_exec < s.throttle_time ) return;

		var point  = e.changedTouches ? e.changedTouches[0] : (e || window.event);
		var x = point.clientX || point.pageX || 0.0, y = point.clientY || point.pageY || 0.0;
		var rect = targetEl.getBoundingClientRect();
		x = x - rect.left - targetEl.clientLeft;
		y = y - rect.top  - targetEl.clientTop;
		var deltaD, deltaX = lastX - x, deltaY = lastY - y;

		if( e.touches && e.touches.length > 1 ){
			// マルチタッチの場合
			x = e.touches[1].pageX - e.touches[0].pageX;
			y = e.touches[1].pageY - e.touches[0].pageY;
			deltaD = (Math.sqrt( x*x + y*y ) - pinchWidth ) / pinchWidth;

            // touchにシフトってあるの？
			if( (s.mode == 0) || (s.mode == 2 && (!e.shiftKey) ) ){
				// カメラ側が動く
				vec3.subtract( cam.direction, cam.centerOfInterest, cam.eyePoint );
				vec3.normalize( cam.direction, cam.direction );
				vec3.scale( cam.direction, cam.direction, cam.distance * ( 1.0 - deltaD*0.05) );
				vec3.subtract( cam.eyePoint, cam.centerOfInterest, cam.direction );
			}else{
				// Focusが動く
				vec3.subtract( cam.direction, cam.centerOfInterest, cam.eyePoint );
				vec3.normalize( cam.direction, cam.direction );
				vec3.scale( cam.direction, cam.direction, cam.distance * ( 1.0 - deltaD*0.05) );
				vec3.add( cam.centerOfInterest, cam.eyePoint, cam.direction );
			}
		}else{
			// マウスまたはタッチ１本の場合
			var θ = deltaX * s.sensitivity;
			if( s.rotateAxis == null){
				// up方向の回転
				vec3v = vec3.clone(lastUp);
				vec3h = vec3.clone(lastRight);
			}else{
				// rotateAxisの回転
				vec3v = s.rotateAxis;
				vec3h = vec3.cross( vec3.create(), s.rotateAxis, lastDirection );
			}
			vec3.normalize( vec3v, vec3v );
			vec3.normalize( vec3h, vec3h );
		// console.log("onMove:", deltaX, deltaY, vec3v, vec3h);
			quat.setAxisAngle(qQ, vec3v, θ);
			vec3.transformQuat(vec3s, vec3v, qQ);
			vec3.transformQuat(vec3t, vec3h, qQ);
			vec3.transformQuat(vec3u, lastDirection, qQ);
			vec3.transformQuat(vec3v, lastUp, qQ);
			// right方向の回転
			θ = deltaY * s.sensitivity;
			quat.setAxisAngle(qQ, vec3t, θ);
			vec3.transformQuat(cam.worldUp, vec3v, qQ);
			vec3.transformQuat(lastDirection, vec3u, qQ);
			if( (s.mode == 0) || (s.mode == 2 && (!e.shiftKey) ) ){
				// カメラを移動させる
				vec3.add( cam.eyePoint, cam.centerOfInterest, lastDirection );
			}else{
				// Focusを移動させる
				vec3.subtract( cam.centerOfInterest, cam.eyePoint, lastDirection );
			}
		}
	//console.log( "onMove:", x,y, deltaX,deltaY, e );
		// 更新
		if( outOfEnvelope() ){
			rollbackState();
		}else{
			setLastState();
		}
		lastX = x; lastY = y;
		// last_exec = now;
		e.preventDefault(); // これをしないとTouchの場合スクロールしてしまう
	}

	document.addEventListener( _end, onEnd, false);
	// documentに対して設定するので、他のinteractiveからも呼び出されてしまう。
	function onEnd(e){
		if( !bActive ) return;
		lastTime = (new Date()).getTime();
		bActive = false;
		that.onDeactivate();
	};

	if( !s.ignoreWheel ){
		targetEl.addEventListener( _wheel, onWheel, false);	// ターゲットに設定すればよい
	}
	function onWheel(e){
		var e = e || window.event;
		// WHEEL EVENT has 3 cases 
		var delta = e.deltaY ? e.deltaY : (e.wheelDelta ? e.wheelDelta : e.detail);
		if( Math.abs(delta) > 30 ) delta = delta / 30;
        var dis = cam.distance * ( 1.0 + delta*0.005);

		setLastState();
		if( (s.mode == 0) || (s.mode == 2 && (!e.shiftKey) ) ){
			// カメラ側が動く
			vec3.subtract( cam.direction, cam.centerOfInterest, cam.eyePoint );
			vec3.normalize( cam.direction, cam.direction );
			vec3.scale( cam.direction, cam.direction, dis );
			vec3.subtract( cam.eyePoint, cam.centerOfInterest, cam.direction );
		}else{
			// Focusが動く
			vec3.subtract( cam.direction, cam.centerOfInterest, cam.eyePoint );
			vec3.normalize( cam.direction, cam.direction );
			vec3.scale( cam.direction, cam.direction, dis );
			vec3.add( cam.centerOfInterest, cam.eyePoint, cam.direction );
		}
		if( outOfEnvelope() ){
			rollbackState();
		}
		e.stopPropagation();
		e.preventDefault(); // これをしないと動いてしまう
	};
    this.changeCam = function( newCam ){
        cam = newCam;
    };
    return this;
};

///////////////////////////  geometry  /////////////////////////////////

objGeometry = function(_obj, _mtl, _scale){
    // mtlファイルの解読(MTLはPhong Shadingが念頭にある)
    var scale = (_scale == undefined) ? 1.0 : _scale;
    var i,j,k,l,m,n,w, mtl_dic = {}, currentM = null;
    var lines = _mtl.split('\n');
    for(i = 0, n = lines.length;i < n;i++) {
        w = lines[i].split(' ');
        switch(w[0]) {
            case "newmtl":
                if( currentM ){
                    mtl_dic[currentM.name] = currentM;
                }
                currentM = {"name": w[1], "faces":[]};
                break;
            case "Ka":  // Ambient Color
                currentM.ka = [+w[1], +w[2], +w[3]];
                break;
            case "Kd":  // Diffuse Color
                currentM.kd = [+w[1], +w[2], +w[3]];
                break;
            case "Ks":  // Specular Color
                currentM.ks = [+w[1], +w[2], +w[3]];
                break;
            case "Ns":  // Sepecular Exponent(0-1000)
                currentM.ns = +w[1];
                break;
            case "map_Kd": // Diffuse Texture Map
                console.log("diffuse texture:", w[1]);
                currentM.texture = w[1];
                break;
            case "illum":  // illumination mode
                currentM.mode = +w[1];
                break;
            case "d":  // transparency
            case "Tr": // alias of transparency
            case "map_bump": // Bump Map
            case "map_Ns": // Specular highlight Map
            case "map_Ks": // Specular color Map
            case "bump": // Bump Map
            case "disp": // Displacement Map
            case "decal": // Stencil Decal Map
            default:
                break;
        }
    }
    mtl_dic[currentM.name] = currentM;
    // default materialの追加。これによりマテリアルは必ず存在する
    mtl_dic["default"] = {
        name: "default",
        ka: [1.0,1.0,1.0],
        kd: [0.5, 0.5, 0.5],
        ks: [0.0, 0.0, 0.0],
        mode: 1,
        ns: 1,
        faces: [],
        texture: null
    };

    // objファイルの解読
    var nVertices = 0, nNormal = 0, nUV = 0;
    // http://www.hiramine.com/programming/3dmodelfileformat/objfileformat.html
    // マテリアル単位でグループをまとめる
    var vertices = [], normals = [], sharedNormals = [], uvs = [];
    var smoothing = false, currentMaterial = mtl_dic["default"];
    lines = _obj.split('\n');
    for(i = 0, nLines = lines.length;i < nLines;i++) {
        w = lines[i].split(' ');
        switch(w[0]) {
        // vertex data
            case "v": // 第４要素のwがある場合もある。ファイルでインデックスは共通
                vertices.push( vec3.fromValues(+w[1]*scale,+w[2]*scale,+w[3]*scale) );
                sharedNormals.push( vec3.create() );
                break;
            case "vt": // テクスチャー座標
                uvs.push( vec2.fromValues(+w[1],+w[2]) );
                break;
            case "vn": // 法線ベクトル。正規化されている保証はない。objファイルはccwとは決まっていないので、法線が表を決める。
                normals.push( vec3.fromValues(+w[1],+w[2],+w[3]) );
                break;
            // free-form geometryで使うもの
            case "cstype": // 多項式曲面、ベジエ、スプライン曲線など
            case "vp": // 最大３要素のパラメーラがある場合がある
            case "deg":
            case "bmat": // basis matrix
            case "step": //step size
                break;
        // element data
            case "p": // point
            case "l": // lines
            case "curv": // curve
            case "surf": // surface
                break;
            case "f":
                // 頂点座標値番号/テクスチャ座標値番号/頂点法線ベクトル番号が３つ以上続く
                var v_index, uv_index, n_index, _faces = [];
                for(var j = 1, m = w.length;j < m;j++) {
                    var nums = (w[j]+"//").split('/');
                    v_index  = +nums[0] - 1;
                    uv_index = (nums[1].length == 0) ? null : (+nums[1] - 1);
                    n_index  = (nums[2].length == 0) ? null : (+nums[2] - 1);
                    _faces.push({v: v_index, uv: uv_index, n: n_index});
                }
                var v0,v1,v2,n0,n1,n2,u0,u1,u2;
                var n = vec3.create(), a = vec3.create(), b = vec3.create();
                for(j = 2;j < _faces.length;j++) {
                    v0 = _faces[0].v;
                    v1 = _faces[j-1].v;
                    v2 = _faces[j].v;
                    u0 = _faces[0].uv;
                    u1 = _faces[j-1].uv;
                    u2 = _faces[j].uv;
                    if( _faces[0].n == null ){
                        // normalがない場合
                        vec3.sub( a, vertices[v1], vertices[v0] );
                        vec3.sub( b, vertices[v2], vertices[v0] );
                        vec3.cross( n, a, b );
                        vec3.normalize( n, n );
                        if(smoothing){ // 法線を共有する
                            n0 = v0;n1 = v1;n2 = v2;
                            vec3.add( sharedNormals[v0], sharedNormals[v0], n );
                            vec3.add( sharedNormals[v1], sharedNormals[v1], n );
                            vec3.add( sharedNormals[v2], sharedNormals[v2], n );
                        }else{
                            n0 = sharedNormals.length;
                            n1 = n0 + 1;
                            n2 = n1 + 1;
                            sharedNormals.push( vec3.clone( n ) );
                            sharedNormals.push( vec3.clone( n ) );
                            sharedNormals.push( vec3.clone( n ) );
                        }
                    }else{
                        // normalがある場合
                        if(smoothing){ // 法線を共有する
                            n0 = v0;n1 = v1;n2 = v2;
                            vec3.add( sharedNormals[v0], sharedNormals[v0], normals[_faces[0].n] );
                            vec3.add( sharedNormals[v1], sharedNormals[v1], normals[_faces[j-1].n] );
                            vec3.add( sharedNormals[v2], sharedNormals[v2], normals[_faces[j].n] );
                        }else{
                            n0 = sharedNormals.length;
                            n1 = n0 + 1;
                            n2 = n1 + 1;
                            sharedNormals.push( vec3.clone( normals[_faces[0].n] ) );
                            sharedNormals.push( vec3.clone( normals[_faces[j-1].n] ) );
                            sharedNormals.push( vec3.clone( normals[_faces[j].n] ) );
                        }
                    }
                    currentMaterial.faces.push({
                        v: [ v0, v1, v2 ],
                        n: [ n0, n1, n2 ],
                        uv:[ u0, u1, u2 ]
                    });
                }
                break;
        // grouping 複数のグループに属することもできる
            case "s": // smoothing group 0/offか1/on
                smoothing = (w[1] == "0" || w[1] == "off") ? false : true;
                break;
            case "g":  // グループ名（ない場合は全体で１グループ）
            case "o":  // オブジェクト名は管理用にすぎない
            case "mg": // merging group
                break;
        // display attributes state-settingなので変更されるまで維持される(属性ではない)
            case "usemtl":
                currentMaterial = mtl_dic[w[1]];
                break;
            case "mtllib": // マテリアルファイル名（複数ある場合もある）
                console.log("material file name :", w[1]);
                break;
            case "#":
                // コメント欄 
                console.log(lines[i]);
            default:
                break;
        }
    }

    sharedNormals.forEach(function(n){vec3.normalize(n, n);});

    var nFaces = 0;
    var contexts = this.contexts = [];
    Object.keys(mtl_dic).forEach(function(key){
        contexts.push({
            material: mtl_dic[key],
            posFace: nFaces,
            offset: nFaces * 3,
            count: mtl_dic[key].faces.length * 3
        });
        nFaces += mtl_dic[key].faces.length;
    });

    var vers = this.vertices = new Float32Array( nFaces * 9 );
    var norm = this.normals = new Float32Array( nFaces * 9 );
    var uv   = this.uvs = new Float32Array( nFaces * 6 );

    var pos = 0;
    Object.keys(mtl_dic).forEach(function(key){
        var mat = mtl_dic[key], nFaces = mat.faces.length;
        for (var i = 0, n = mat.faces.length;i < n;++i){
            var _v = mat.faces[i].v;
            vers[pos*9]   = vertices[_v[0]][0];
            vers[pos*9+1] = vertices[_v[0]][1];
            vers[pos*9+2] = vertices[_v[0]][2];
            vers[pos*9+3] = vertices[_v[1]][0];
            vers[pos*9+4] = vertices[_v[1]][1];
            vers[pos*9+5] = vertices[_v[1]][2];
            vers[pos*9+6] = vertices[_v[2]][0];
            vers[pos*9+7] = vertices[_v[2]][1];
            vers[pos*9+8] = vertices[_v[2]][2];
            var _n = mat.faces[i].n;
            norm[pos*9]   = sharedNormals[_n[0]][0];
            norm[pos*9+1] = sharedNormals[_n[0]][1];
            norm[pos*9+2] = sharedNormals[_n[0]][2];
            norm[pos*9+3] = sharedNormals[_n[1]][0];
            norm[pos*9+4] = sharedNormals[_n[1]][1];
            norm[pos*9+5] = sharedNormals[_n[1]][2];
            norm[pos*9+6] = sharedNormals[_n[2]][0];
            norm[pos*9+7] = sharedNormals[_n[2]][1];
            norm[pos*9+8] = sharedNormals[_n[2]][2];
            var _u = mat.faces[i].uv;
            uv[pos*6]   = ( _u[0] == null ) ? 0.0 : uvs[_u[0]][0];
            uv[pos*6+1] = ( _u[0] == null ) ? 0.0 : uvs[_u[0]][1];
            uv[pos*6+2] = ( _u[0] == null ) ? 1.0 : uvs[_u[1]][0];
            uv[pos*6+3] = ( _u[0] == null ) ? 0.0 : uvs[_u[1]][1];
            uv[pos*6+4] = ( _u[0] == null ) ? 1.0 : uvs[_u[2]][0];
            uv[pos*6+5] = ( _u[0] == null ) ? 1.0 : uvs[_u[2]][1];
            ++pos;
        }
    });
    this.attachTexture = function(){
        for (var i = 0;i < arguments.length;++i){
            for(var j = 0;j < contexts.length;++j){
                var context = contexts[j];
                if (context.material.texture == arguments[i].name){
                    context.material.texture = arguments[i];
                    break;
                }
            }
            if( j ==  contexts.length) console.log("can't attach texture:", arguments[i]);
        }
    };
    this.mode = GL_TRIANGLES;
    this.draw = function( vertexBuffer, first, count ){
        vertexBuffer.drawArrays( this.mode, first, count );
    };
    return this;
};

objBinaryGeometry = function(_ver, _uv, _v_index, _uv_index, mtl, _scale){
    var scale = (_scale == undefined) ? 1.0 : _scale;
    var _vers = new Float32Array(_ver),
        _uvs  = new Float32Array(_uv),
        _v_indices   = new Uint16Array(_v_index),
        _uv_indices  = new Uint16Array(_uv_index);

    var nVertices = _vers.length / 3;

    var sharedNormals = [];
    for (var i = 0;i < nVertices;++i ) sharedNormals.push(vec3.create());

    var contexts = this.contexts = [], nFaces = 0;
    Object.keys(mtl).forEach(function(_mat){
        var mat = mtl[_mat];
        mat.faces = [];
        var f_index = mat.startFace, f_end = f_index + mat.nFaces;
        // UVがあるかどうか
        var bHasUV = mat.nUVs > 0;
        if (bHasUV){
            var uv_index = mat.startUV, uv_end = uv_index + mat.nUVs;
            // UVとfaceは一致すること
        }
        var a,b,c,v0,v1,v2,n0,n1,n2,u0,u1,u2;
        for(;f_index < f_end;++f_index){
            v0 = _v_indices[f_index*3];
            v1 = _v_indices[f_index*3+1];
            v2 = _v_indices[f_index*3+2];
            a = vec3.fromValues( _vers[v0*3], _vers[v0*3+1], _vers[v0*3+2]);
            b = vec3.fromValues( _vers[v1*3], _vers[v1*3+1], _vers[v1*3+2]);
            c = vec3.fromValues( _vers[v2*3], _vers[v2*3+1], _vers[v2*3+2]);

            if( bHasUV ){
                // UVがある場合
                u0 = _uv_indices[uv_index*3];
                u1 = _uv_indices[uv_index*3+1];
                u2 = _uv_indices[uv_index*3+2];
                ++uv_index;
            }else{
                // UVがない場合
                u0 = u1 = u2 = null;
            }
            // normalを作る
            var _b = vec3.create(), _c = vec3.create(), n = vec3.create();
            vec3.sub( _b, b, a );
            vec3.sub( _c, c, a );
            vec3.cross( n, _b, _c );
            vec3.normalize( n, n );
            if(mat.smoothing){
                // smoothingする場合
                n0 = v0;n1 = v1;n2 = v2;
                vec3.add( sharedNormals[v0], sharedNormals[v0], n );
                vec3.add( sharedNormals[v1], sharedNormals[v1], n );
                vec3.add( sharedNormals[v2], sharedNormals[v2], n );
            }else{
                // smoothingしない場合
                n0 = sharedNormals.length;
                n1 = n0 + 1;
                n2 = n1 + 1;
                sharedNormals.push( vec3.clone(n) );
                sharedNormals.push( vec3.clone(n) );
                sharedNormals.push( vec3.clone(n) );
            }
            mat.faces.push({ v: [ v0, v1, v2 ], n: [ n0, n1, n2 ], uv:[ u0, u1, u2 ]});
        }
        contexts.push({"material": mat, "posFace": nFaces, "offset": nFaces * 3, "count": mat.faces.length * 3});
        nFaces += mat.faces.length;
    });

    sharedNormals.forEach(function(n){vec3.normalize(n, n);});

    var vers = this.vertices = new Float32Array( nFaces * 9 );
    var norm = this.normals = new Float32Array( nFaces * 9 );
    var uv   = this.uvs = new Float32Array( nFaces * 6 );

    contexts.forEach(function(context){
        var mat = context.material;
        var pos = context.posFace;
        for (var i = 0, n = mat.faces.length;i < n;++i){
            var _v = mat.faces[i].v;
            vers[pos*9]   = _vers[_v[0]*3]*scale;
            vers[pos*9+1] = _vers[_v[0]*3+1]*scale;
            vers[pos*9+2] = _vers[_v[0]*3+2]*scale;
            vers[pos*9+3] = _vers[_v[1]*3]*scale;
            vers[pos*9+4] = _vers[_v[1]*3+1]*scale;
            vers[pos*9+5] = _vers[_v[1]*3+2]*scale;
            vers[pos*9+6] = _vers[_v[2]*3]*scale;
            vers[pos*9+7] = _vers[_v[2]*3+1]*scale;
            vers[pos*9+8] = _vers[_v[2]*3+2]*scale;
            var _n = mat.faces[i].n;
            norm[pos*9]   = sharedNormals[_n[0]][0];
            norm[pos*9+1] = sharedNormals[_n[0]][1];
            norm[pos*9+2] = sharedNormals[_n[0]][2];
            norm[pos*9+3] = sharedNormals[_n[1]][0];
            norm[pos*9+4] = sharedNormals[_n[1]][1];
            norm[pos*9+5] = sharedNormals[_n[1]][2];
            norm[pos*9+6] = sharedNormals[_n[2]][0];
            norm[pos*9+7] = sharedNormals[_n[2]][1];
            norm[pos*9+8] = sharedNormals[_n[2]][2];
            var _u = mat.faces[i].uv;
            uv[pos*6]   = ( _u[0] == null ) ? 0.0 : _uvs[_u[0]*2];
            uv[pos*6+1] = ( _u[0] == null ) ? 0.0 : _uvs[_u[0]*2+1];
            uv[pos*6+2] = ( _u[1] == null ) ? 1.0 : _uvs[_u[1]*2];
            uv[pos*6+3] = ( _u[1] == null ) ? 0.0 : _uvs[_u[1]*2+1];
            uv[pos*6+4] = ( _u[2] == null ) ? 1.0 : _uvs[_u[2]*2];
            uv[pos*6+5] = ( _u[2] == null ) ? 1.0 : _uvs[_u[2]*2+1];
            ++pos;
        }
    });
    this.attachTexture = function(){
        for (var i = 0;i < arguments.length;++i){
            for(var j = 0;j < contexts.length;++j){
                var context = contexts[j];
                if (context.material.texture == arguments[i].name){
                    context.material.texture = arguments[i];
                    break;
                }
            }
            if( j ==  contexts.length) console.log("can't attach texture:", arguments[i]);
        }
    };
    this.mode = GL_TRIANGLES;
    this.draw = function( vertexBuffer, first, count ){
        vertexBuffer.drawArrays( this.mode, first, count );
    };
    return this;
};

quakeGeometry = function(s, mag){
	// xy平面
	var top = 0.5, right = 0.5, bottom = 0.0, left = 0.0;
	if ( 0.0 <= mag && mag < 1.0 ){s *= 1.5;top = 0.5;right = 1.0;bottom = 0.0;left = 0.5;}
	if ( 1.0 <= mag && mag < 2.0 ){s *= 2.0;top = 1.0;right = 0.5;bottom = 0.5;left = 0.0;}
	if ( 2.0 <= mag ){s *= 3.0;top = 1.0;right = 1.0;bottom = 0.5;left = 0.5;}
    this.vertices = new Float32Array( [ s/2,s/2,0, s/2,s/-2,0, s/-2,s/-2,0,  s/2,s/2,0, s/-2,s/-2,0, s/-2,s/2,0 ] );
    this.normals  = new Float32Array( [ 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1 ] );
    this.uvs      = new Float32Array( [ right,top, right,bottom, left,bottom,  right,top, left,bottom, left,top ] );
    this.mode     = GL_TRIANGLES;
    this.draw = function( vertexBuffer ){
        vertexBuffer.drawArrays( this.mode );
    };
}

terrainGeometry = function(vertices, faces){
    var _v = new Uint16Array(vertices), _f = new Int16Array(faces);
    // console.log( "vertex:", _v.length, "faces:", _f.length );
    var vers =  this.vertices = new Float32Array( _v.length );
    var norm =  this.normals  = new Float32Array( _v.length );
    var uv =    this.uvs      = new Float32Array( _v.length/3*2 );
    var index = this.index    = new Uint16Array( _f.length );

    var offset_x = 139.0, offset_y = 35.25, offset_z = 0.0;
    var scale_x = 90163.292 * 0.001, scale_y = 110949.769 * 0.001, scale_z = 0.001;
    var news = [35.3333+0.0003, 139.125-0.00099, 138.875-0.00099, 35.1671+0.0003];

    function fX(x,y,z){return (x - offset_x) * scale_x;};
    function fY(x,y,z){return (y - offset_y) * scale_y;};
    function fZ(x,y,z){return (z - offset_z) * scale_z;};
    var xPitch = news[1] - news[2], yPitch = news[3] - news[0], n2 = news[2], n3 = news[3];
    function getUV(x,y){
        var u = (x - n2) / xPitch, v = (n3 - y) / yPitch;
        u = (u > 1.0) ? 1.0 : (u < 0.0) ? 0.0 : u;
        v = (v > 1.0) ? 1.0 : (v < 0.0) ? 0.0 : v;
        return [u,v];
    }
    var x,y,z,mx = 0.0001112099644,my = 0.0001112594126;
    for(var i = 0,n = _v.length;i < n;i+=3){
        x = 138.875 + mx * _v[i];
        y = 35.1671117 + my * _v[i+1];
        z = 19.7 + 0.1 * _v[i+2];
        // console.log( x,y,z );
        vers[i] = fX(x,y,z);vers[i+1] = fY(x,y,z);vers[i+2] = fZ(x,y,z);
        norm[i] = 0;norm[i+1] = 0;norm[i+2] = 1;
        var res = getUV( x,y );
        uv[i/3*2] = res[0];uv[i/3*2+1] = res[1];
    }
    x = 0;
    for(i = 0,n = _f.length;i < n;i+= 3){
        x = x + _f[i];y = x + _f[i+1];z = x + _f[i+2];
        if ( (x > 256*256-1) || (y > 256*256-1) || (z > 256*256-1) ){
        	// indexはUint16なのでオーバーフローはまずい
        	console.log( "Uint16: index overflow" );
        }
        index[i] = x;index[i+1] = y;index[i+2] = z;
    }
    this.toGeometryCoord = function(x,y,z){return [fX(x,y,z),fY(x,y,z),fZ(x,y,z)];};
    this.mode     = GL_TRIANGLES;
    this.draw = function(indexBuffer){
        indexBuffer.drawElements( this.mode );
    };
    return this;
};
flatTerrainGeometry = function(north,east,west,south, _nDivide){
	var nDivide = _nDivide || 10;

    var vers =  this.vertices = new Float32Array( (nDivide + 1)*(nDivide + 1)*3 );
    var norm =  this.normals  = new Float32Array( (nDivide + 1)*(nDivide + 1)*3 );
    var uv =    this.uvs      = new Float32Array( (nDivide + 1)*(nDivide + 1)*2 );
    // インデックスは65536まで
    if( nDivide*nDivide*2 > 65535 ) console.log("index buffer overflow");
    var index = this.index    = new Uint16Array( nDivide*nDivide*6 );

    var offset_x = 139.0, offset_y = 35.25, offset_z = 0.0;
    var scale_x = 90163.292 * 0.001, scale_y = 110949.769 * 0.001, scale_z = 0.001;
    var news = [north,east,west,south];
    function fX(x,y,z){return (x - offset_x) * scale_x;};
    function fY(x,y,z){return (y - offset_y) * scale_y;};
    function fZ(x,y,z){return (z - offset_z) * scale_z;};
    var deg_width = news[1] - news[2], deg_height = news[3] - news[0], n2 = news[2], n3 = news[3];
    function getUV(x,y){
        var u = (x - n2) / deg_width, v = (n3 - y) / deg_height;
        u = (u > 1.0) ? 1.0 : (u < 0.0) ? 0.0 : u;
        v = (v > 1.0) ? 1.0 : (v < 0.0) ? 0.0 : v;
        return [u,v];
    }
    var x,y,z,mx = deg_width/nDivide, my = deg_height/nDivide * -1.0, c = 0;

    for(var i = 0; i < nDivide + 1; ++i){
    	for(var j = 0; j < nDivide + 1; ++j){
        	x = west + mx * j;
        	y = south + my * i;
        	z = 0.0;
        	vers[c*3] = fX(x,y,z);vers[c*3+1] = fY(x,y,z);vers[c*3+2] = fZ(x,y,z);
        	norm[c*3] = 0.0;norm[c*3+1] = 0.0;norm[c*3+2] = 1.0;
        	var res = getUV( x,y );
        	uv[c*2] = res[0];uv[c*2+1] = res[1];
        	++c;
        }
    }
    c = 0;
    for(var i = 0; i < nDivide; ++i){
    	for(var j = 0; j < nDivide; ++j){
    		var leftBottom = (nDivide + 1) * i + j
    		var leftTop = (nDivide + 1) * (i + 1) + j
    		index[c*6] = leftBottom;
    		index[c*6+1] = leftBottom + 1;
    		index[c*6+2] = leftTop;
    		index[c*6+3] = leftBottom + 1;
    		index[c*6+4] = leftTop + 1;
    		index[c*6+5] = leftTop;
        	++c;
        }
    }
    this.toGeometryCoord = function(x,y,z){return [fX(x,y,z),fY(x,y,z),fZ(x,y,z)];};
    this.mode     = GL_TRIANGLES;
    this.draw = function(indexBuffer){
        indexBuffer.drawElements( this.mode );
    };
    return this;
};

gridGeometry = function(from, to, step, nLayers){
	// xy平面 LINE_STRIPではない！
	var nLines = parseInt((to - from) / step) + 1;
    var vers = this.vertices = new Float32Array( nLayers * nLines * 6 * 3 );
    // var colors = this.colors = new Float32Array( nLayers * nLines * 4 * 4 );
    for( var layer = 0; layer < nLayers; ++layer){
    	for( var i = from, j = 0 ; i <= to; i += step){
    		var n = layer*nLines*18 + j*18;
    		vers[n]   = i;	vers[n+1] = from;	vers[n+2] = layer * -1;
    		vers[n+3] = i;	vers[n+4] = to;		vers[n+5] = layer * -1;
    		vers[n+6] = from;vers[n+7] = i;		vers[n+8] = layer * -1;
    		vers[n+9] = to;	vers[n+10] = i;		vers[n+11] = layer * -1;
    		vers[n+12] = i;vers[n+13] = i;		vers[n+14] = layer * -1 + 0.1;
    		vers[n+15] = i;vers[n+16] = i;		vers[n+17] = layer * -1;
    		++j;
    	}
    }
    this.mode     = GL_LINES;
    this.draw = function( vertexBuffer ){
        vertexBuffer.drawArrays( this.mode );
    };
}
linesGeometry = function(lines){
	// xy平面 LINE_STRIPではない！
	var nLines = 0;
	lines.forEach(function(line){
		nLines += line.points.length - 1;
	});
    var vers = this.vertices = new Float32Array( nLines * 2 * 3 );
    var colors = this.colors  = new Float32Array( nLines * 2 * 4 );
    var i = 0;
	lines.forEach(function(line){
		for( var j = 0, n = line.points.length - 1;j < n;++j){
			vers[i*3] = line.points[j][0];vers[i*3+1] = line.points[j][1];vers[i*3+2] = line.points[j][2];
			colors[i*4] = line.rgba[0];colors[i*4+1] = line.rgba[1];colors[i*4+2] = line.rgba[2];colors[i*4+3] = line.rgba[3];
			++i;
			var k = j + 1;
			vers[i*3] = line.points[k][0];vers[i*3+1] = line.points[k][1];vers[i*3+2] = line.points[k][2];
			colors[i*4] = line.rgba[0];colors[i*4+1] = line.rgba[1];colors[i*4+2] = line.rgba[2];colors[i*4+3] = line.rgba[3];
			++i;
		}
	});
    this.mode     = GL_LINES;
    this.draw = function( vertexBuffer ){
        vertexBuffer.drawArrays( this.mode );
    };
}

sphereGeometry = function(_latBand, _lonBand, _radius){
	// xy平面
	var latBands = _latBand || 60;
	var lonBands = _lonBand || 60;
	var rad = _radius || 1;
    var vers = this.vertices = new Float32Array( (latBands+1)*(lonBands+1)*3 );
    var norm = this.normals  = new Float32Array( (latBands+1)*(lonBands+1)*3 );
    var uv = this.uvs        = new Float32Array( (latBands+1)*(lonBands+1)*2 );
    var index = this.index   = new Uint16Array( latBands*lonBands*6 );

    var i = 0;
	for (var lat=0; lat <= latBands; lat++) {
		var theta = lat * Math.PI / latBands, sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);
		for (var lon=0; lon <= lonBands; lon++) {
			var phi = lon * 2 * Math.PI / lonBands, sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
			var x = cosPhi * sinTheta, y = cosTheta, z = sinPhi * sinTheta;
			var u = 1 - (lon / lonBands), v = 1 - (lat / latBands);
			norm[i*3] = x;norm[i*3+1] = y;norm[i*3+2] = z;
			uv[i*2] = u;uv[i*2+1] = v;
			vers[i*3] = rad * x;vers[i*3+1] = rad * y;vers[i*3+2] = rad * z;
			++i;
		}
	}
	i = 0;
	for (var lat=0; lat < latBands; lat++) {
		for (var lon=0; lon < lonBands; lon++) {
			var first = (lat * (lonBands + 1)) + lon, second = first + lonBands + 1;
			index[i*6] = first;index[i*6+1] = second;index[i*6+2] = first+1;
			index[i*6+3] = second;index[i*6+4] =  second+1;index[i*6+5] = first+1;
			++i;
		}
    }
    this.mode     = GL_TRIANGLES;
    this.draw = function(indexBuffer){
        indexBuffer.drawElements( this.mode );
    };
}

ringGeometry = function(_nBand, _radius, _height){
	// xy平面に高さheightのリングを作る
	var nBands = _nBand || 60;
	var rad = _radius || 1;
	var height = _height || 1;
    var vers = this.vertices = new Float32Array( (nBands+1) * 2 * 3 );
    var norm = this.normals  = new Float32Array( (nBands+1) * 2 * 3 );
    var uv = this.uvs        = new Float32Array( (nBands+1) * 2 * 2 );
    var index = this.index   = new Uint16Array( nBands * 2 * 3 );
	for (var i = 0; i <= nBands; i++) {
		var theta = i * Math.PI * 2 / nBands, sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);
		var x = rad * cosTheta, y = rad * cosTheta, z = height;
		vers[i*6]   = x;		norm[i*6]   = cosTheta;
		vers[i*6+1] = y;		norm[i*6+1] = sinTheta;
		vers[i*6+1] = z;		norm[i*6+2] = 0.0;
		vers[i*6+1] = x;		norm[i*6+3] = cosTheta;
		vers[i*6+1] = y;		norm[i*6+4] = sinTheta;
		vers[i*6+1] = z * -1.0;	norm[i*6+5] = 0.0;
		uv[i*4] = i / nBands;
		uv[i*4+1] = 1.0;
		uv[i*4+2] = i / nBands;
		uv[i*4+3] = 0.0;
	}
	for (var i = 0; i < nBands; i++) {
		var pos = i * 2, next = (i == nBands - 1) ? 0 : (pos + 2);
		index[i*6]   = pos;
		index[i*6+1] = pos + 1;
		index[i*6+2] = next;
		index[i*6+3] = pos + 1;
		index[i*6+4] = next + 1;
		index[i*6+5] = next;
	}
    this.mode     = GL_TRIANGLES;
    this.draw = function(indexBuffer){
        indexBuffer.drawElements( this.mode );
    };
}

arrowGeometry = function(_size, _head_height, _head_width, _body_height, _depth){
	// xy平面にx軸マイナス領域から原点を指す矢印をつくる
	var s = _size || 1.0, _s = s * -1.0;
	var h = s * ( _head_height || 0.15 ), _h = h * -1.0;
	var w = s * ( _head_width || 0.25 ), _w = w * -1.0;
	var b = s * ( _body_height || 0.05 ), _b = b * -1.0;
	var d = s * ( _depth || 0.02 ), _d = d * -1.0;

	var l = Math.sqrt( w*w + h*h );
	var vec_x =  h / l, vec_y = w / l;

	var v = [
		0,0,d, _w,h,d, _w,_h,d,
		_w,b,d, _s,b,d, _s,_b,d,
		_w,b,d, _s,_b,d, _w,_b,d,
		0,0,_d, _w,_h,_d, _w,h,_d,
		_w,b,_d, _s,_b,_d, _s,b,_d,
		_w,b,_d, _w,_b,_d, _s,_b,_d,
		0,0,d, 0,0,_d, _w,h,d,
		0,0,_d, _w,h,_d, _w,h,d,
		_w,h,d, _w,h,_d, _w,b,d,
		_w,h,_d, _w,b,_d, _w,b,d,
		_w,b,d, _w,b,_d, _s,b,d,
		_w,b,_d, _s,b,_d, _s,b,d,
		_s,b,d, _s,b,_d, _s,_b,d,
		_s,b,_d, _s,_b,_d, _s,_b,d,
		_s,_b,d, _s,_b,_d,  _w,_b,d,
		_s,_b,_d, _w,_b,_d,  _w,_b,d,
		_w,_b,d, _w,_b,_d, _w,_h,d,
		_w,_b,_d, _w,_h,_d, _w,_h,d,
		_w,_h,d, _w,_h,_d, 0,0,d, 
		_w,_h,_d, 0,0,_d, 0,0,d
	];
	var n = [
		0,0,1,0,0,1,0,0,1,
		0,0,1,0,0,1,0,0,1,
		0,0,1,0,0,1,0,0,1,
		0,0,-1,0,0,-1,0,0,-1,
		0,0,-1,0,0,-1,0,0,-1,
		0,0,-1,0,0,-1,0,0,-1,
		vec_x,vec_y,0,vec_x,vec_y,0,vec_x,vec_y,0,
		vec_x,vec_y,0,vec_x,vec_y,0,vec_x,vec_y,0,
		-1,0,0,-1,0,0,-1,0,0,
		-1,0,0,-1,0,0,-1,0,0,
		0,1,0,0,1,0,0,1,0,
		0,1,0,0,1,0,0,1,0,
		-1,0,0,-1,0,0,-1,0,0,
		-1,0,0,-1,0,0,-1,0,0,
		0,-1,0,0,-1,0,0,-1,0,
		0,-1,0,0,-1,0,0,-1,0,
		-1,0,0,-1,0,0,-1,0,0,
		-1,0,0,-1,0,0,-1,0,0,
		vec_x,-vec_y,0,vec_x,-vec_y,0,vec_x,-vec_y,0,
		vec_x,-vec_y,0,vec_x,-vec_y,0,vec_x,-vec_y,0
	];
    this.vertices = new Float32Array( v );
    this.normals = new Float32Array( n );
    this.uvs = new Float32Array( 60*2 );
    var index = this.index  = new Uint16Array( 60*3 );
    for (var i = 0;i < 60;++i) index[i] = i;
    this.mode     = GL_TRIANGLES;
    this.draw = function(indexBuffer){
        indexBuffer.drawElements( this.mode );
    };
}

cameraGeometry = function( _fovy, _aspect, _nearPlane ){
    // fovを表現する視野錐体を線で表現する(z軸マイナス方向を向いている)
    // カメラのfovyは縦方向の画角を指す
    var fovy = deg2rad( _fovy || 90 ) / 2.0;
    var aspect = _aspect || 1.5; // width/height
    var nearPlane = _nearPlane || 1.0;

    var h = nearPlane * Math.tan( fovy ),
        w = h * aspect,
        z = nearPlane * -1.0,
        _w = w*3, _h = h*3, _z = z*3;

    var v = [
        0.0,0.0,0.0,
        w,h,z,
        -w,h,z,
        -w,-h,z,
        w,-h,z,
        _w,_h,_z,
        -_w,_h,_z,
        -_w,-_h,_z,
        _w,-_h,_z,
        0.0,h*1.45,z,
        w*-0.1,h*1.1,z,
        w*0.1, h*1.1,z
    ];
    var i = [
        0,1, 0,2, 0,3, 0,4,
        1,2, 2,3, 3,4, 4,1,
        1,5, 2,6, 3,7, 4,8,
        9,10, 10,11, 11,9
    ];
    this.vertices = new Float32Array( v );
    this.index = new Uint16Array( i );
    this.mode = GL_LINES;
    this.draw = function(indexBuffer){
        indexBuffer.drawElements( this.mode );
    };
}

planeGeometry = function(w,h){
	// xy平面
	var top = 1.0, right = 1.0, bottom = 0.0, left = 0.0;
    this.vertices = new Float32Array( [ w/2,h/2,0, w/2,h/-2,0, w/-2,h/-2,0,  w/2,h/2,0, w/-2,h/-2,0, w/-2,h/2,0 ] );
    this.normals  = new Float32Array( [ 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1 ] );
    this.uvs      = new Float32Array( [ right,top, right,bottom, left,bottom,  right,top, left,bottom, left,top ] );
    this.mode     = GL_TRIANGLES;
    this.draw = function( vertexBuffer ){
        vertexBuffer.drawArrays( this.mode );
    };
}
cubeGeometry = function(_w,_h,_d){
	// 頂点を共有しない場合
	var w = (_w || 1.0)/2, h = (_h || 1.0)/2, d = (_d || 1.0)/2;
    this.vertices = new Float32Array( [ -w,-h,d, w,-h,d, w,h,d, -w,h,d, -w,-h,-d, -w,h,-d, w,h,-d, w,-h,-d, -w,h,-d, -w,h,d, w,h,d, w,h,-d, -w,-h,-d, w,-h,-d, w,-h,d, -w,-h,d, w,-h,-d, w,h,-d, w,h,d, w,-h,d, -w,-h,-d, -w,-h,d, -w,h,d, -w,h,-d ] );
    this.normals  = new Float32Array( [ 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 1,0,0, 1,0,0, 1,0,0, 1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0 ]);
    this.uvs      = new Float32Array( [ 0,0,1,0,1,1,0,1, 1,0,1,1,0,1,0,0, 0,1,0,0,1,0,1,1, 1,1,0,1,0,0,1,0, 1,0,1,1,0,1,0,0, 0,0,1,0,1,1,0,1 ] );
    this.index    = new Uint16Array( [0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11, 12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23] );
    this.mode     = GL_TRIANGLES;
    this.draw = function(indexBuffer){
        indexBuffer.drawElements( this.mode );
    };
}
textGeometry = function(size,uv){
	// xy平面
	var top = uv[0], right = uv[1], bottom = uv[2], left = uv[3],w = (right-left)*size, h = (top-bottom)*size;
    this.vertices = new Float32Array( [ w/2,h/2,0, w/2,h/-2,0, w/-2,h/-2,0,  w/2,h/2,0, w/-2,h/-2,0, w/-2,h/2,0 ] );
    this.normals  = new Float32Array( [ 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,1 ] );
    this.uvs      = new Float32Array( [ right,top, right,bottom, left,bottom,  right,top, left,bottom, left,top ] );
    this.mode     = GL_TRIANGLES;
    this.draw = function( vertexBuffer ){
        vertexBuffer.drawArrays( this.mode );
    };
}

//////////////////////////// helper functions //////////////////////////////////////////

geoTranslator = function(offset_x,offset_y,offset_z,scale_x,scale_y,scale_z){
    function fX(x,y,z){return (x - offset_x) * scale_x;};
    function fY(x,y,z){return (y - offset_y) * scale_y;};
    function fZ(x,y,z){return (z - offset_z) * scale_z;};
    var geoTranslator = function(lon,lat,alt){
        return [fX(lon,lat,alt),fY(lon,lat,alt),fZ(lon,lat,alt)];
    };
    geoTranslator.inverse = function(_x, _y, _z){
        return [_x / scale_x + offset_x, _y / scale_y + offset_y, _z / scale_z + offset_z];
    };
    return geoTranslator;
};
uvTranslator = function(top,right,left,bottom){
    var w = right - left, h = bottom - top;
    var bClamp = true;
    var uvTranslator = function(x,y){
        var u = (x - left) / w, v = (bottom - y) / h;
        if(bClamp){
            u = (u > 1.0) ? 1.0 : (u < 0.0) ? 0.0 : u;
            v = (v > 1.0) ? 1.0 : (v < 0.0) ? 0.0 : v;
        }
        return [u,v];
    };
    uvTranslator.clamp = function(b){
        bClamp = b;
    }
    return uvTranslator;
};

CanvasImage = function(size){
// この関数はobjに応じて書き直す
    size = size || 256;
    var font = "25px sans-serif";
    var fontsize = 25;
    var line, color = "white";
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    var ctx = canvas.getContext("2d");
    render = function(obj){
        line = obj.name.toString();
        ctx.clearRect(0, 0, size, size);
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(line, size / 2, size / 2 );
        // dimensionを付加する
        var text_height = 28;
        var text_width = ctx.measureText( line ).width; // この値は"advance width"で最後の文字の左端(バグの可能性高い)
        text_width += (fontsize * 2);
        if(text_width > size){
            console.log("alert:too long label", text_width, line);
        }
        // top, right, bottom, left
        render.uv = [ (size/2 + text_height/2)/size, (size/2 + text_width/2)/size, (size/2 - text_height/2)/size, (size/2 - text_width/2)/size ];
        return canvas;
    };
    return render;
};














