var WaveSim = (function(){
	
	var STEP_PERIOD = 30;
	var ROWS = 200;
	var COLS = 200;

	var COLOURS = ['rgb(241,238,246)','rgb(208,209,230)','rgb(166,189,219)','rgb(116,169,207)','rgb(54,144,192)','rgb(5,112,176)','rgb(3,78,123)'];

	// Constructor
	var WaveSim = function(){
		this.canvas = document.createElement('canvas');
		this.canvas.style.position = 'fixed';
		this.canvas.style.top = '0';
		this.canvas.style.bottom = '0';
		this.canvas.style.left = '0';
		this.canvas.style.right = '0';
		this.ctx = this.canvas.getContext("2d");
		window.onresize = syncCanvasSize.bind(this);
		syncCanvasSize.call(this);
		document.body.appendChild(this.canvas);
	};

	/**
	 * Synchronises the size of the canvas to the dimensions of the page
	 */
	var syncCanvasSize = function(){
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
	};

	WaveSim.prototype.start = function(){
		this.intervalHandle = setInterval(step.bind(this), STEP_PERIOD);
	};

	WaveSim.prototype.stop = function(){
		if(this.intervalHandle){
			this.intervalHandle.detach();
			this.intervalHandle = null;
		}
	};

	/**
	 * Execute a single step of the wave simulation
	 */
	var step = function(){
		var clr;
		for(var r = 0; r < ROWS; r++){
			for(var c = 0; c < COLS; c++){
				clr = COLOURS[~~(Math.random() * COLOURS.length)];
				drawSquare.call(this, r, c, clr);
			}
		}
	};


	var drawSquare = function(r, c, col){
		this.ctx.fillStyle = col;
		var w = this.canvas.width / COLS;
		var h = this.canvas.height / ROWS;
		var x = c * w;
		var y = r * h;
		this.ctx.fillRect(x, y, w, h);
	};

	// Return constructor
	return WaveSim;
	
})();

// On page load, create wavesim and start simulation
window.addEventListener('load', function(){
	var sim = new WaveSim();
	sim.start();
}, false );
