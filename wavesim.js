/**
 * An analog cellular automaton model of fluid surface dynamics.
 *
 *
 * Copyright (C) 2015  Conrad Rider  <www.crider.co.uk>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with WaveSim.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @module wavesim
 */


/**
 *
 * Top level class, contains the simulation model and manages the canvas
 * drawing and simulation coordination.
 *
 * @class WaveSim
 */
var WaveSim = (function(){


	/**
	 * Creates a new WaveSim instance with the given
	 * configuration. NOTE: After creating the simulation instance
	 * it then needs to be started by calling the start() method.
	 * It can be stopped at any time by calling the stop() method.
	 *
	 * @constructor
	 * @param {Object} conf The Simulation configuration.
	 * Defaults to WaveSim.Conf.SWIMMING_POOL
	 */
	var WaveSim = function(conf){
		this.conf = conf || WaveSim.Conf.SWIMMING_POOL;
		this.isPaused = false;
		this.isProcessing = false;
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
		// If interactive, add mouse handler
		if(this.conf.interactive){
			addHandlers.call(this);
		}
	};


	/**
	 * Synchronises the size of the canvas to the dimensions of the page
	 *
	 * @method syncCanvasSize
	 * @private
	 */
	var syncCanvasSize = function(){
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
	};


	/**
	 * Start a simulation with the given model configuration
	 *
	 * @method start
	 * @param {Object} modelConf The WaveModel configuration.
	 * Defaults to WaveModel.Conf.DRIZZLE
	 */
	WaveSim.prototype.start = function(modelConf){
		this.modelConf = modelConf;
		this.intervalHandle = setInterval(step.bind(this), this.conf.stepPeriod);
		// Initialise the underlying wave model
		this.waveModel = new WaveModel(this.conf.rows, this.conf.cols, modelConf);
	};


	/**
	 * Stop the current simulation. The WaveSim instance can be used
	 * to start a new simulation again with the start method, passing
	 * a new WaveModel configuration object.
	 *
	 * @method stop
	 */
	WaveSim.prototype.stop = function(){
		if(this.intervalHandle){
			this.intervalHandle.detach();
			this.intervalHandle = null;
		}
	};


	/**
	 * Add a ripple with the given properties. Convenience method for
	 * mouse handlers.
	 *
	 * @method addRipple
	 * @param {Object} pos The wave model grid position
	 * @param {Number} delay The mouse press delay in milliseconds
	 */
	WaveSim.prototype.addRipple = function(pos, delay){
		if(!this.waveModel){ return; }
		var ripple = new Ripple(this.waveModel);
		ripple.r = pos.r;
		ripple.c = pos.c;
		ripple.wavelength = ~~Utils.boundVal((delay / 20) + 10, 10, 50); // 1 second for max wavelength
		ripple.mag = Utils.boundVal((delay / 40) + 5, 5, 50); // 2 seconds for max magnitude
		this.waveModel.insertRipple(ripple);
	};


	/**
	 * Execute a single step of the wave simulation.
	 *
	 * @method step
	 * @private
	 */
	var step = function(){
		if(this.isPaused || this.isProcessing){ return; }
		this.isProcessing = true;
		// Apply ripple forces
		this.waveModel.genForces();
		// Execute single step of the wave model
		this.waveModel.modelStep();
		// Draw the resulting magnitude at each cell
		var rows = this.conf.rows, cols = this.conf.cols;
		var base = this.conf.baseCol, alpha = this.conf.opacity;
		var mag, col = {r:0,g:0,b:0,a:1}, clr, r, c;
		for(r = 0; r < rows; r++){
			for(c = 0; c < cols; c++){
				mag = this.waveModel.M[r][c];
				magToCol(mag, base, alpha, col); // Update col basd on magnitude
				if(alpha < 1){
					clr = 'rgba('+col.r+','+col.g+','+col.b+',' + col.a.toFixed(2) + ')';
				}else{
					clr = 'rgb('+col.r+','+col.g+','+col.b+')';
				}
				drawSquare.call(this, r, c, clr, alpha < 1);
			}
		}
		this.isProcessing = false;
	};


	/**
	 * Draws a single squre to the canvas.
	 *
	 * @method drawSquare
	 * @param {Number} r The model row number
	 * @param {Number} c The model column number
	 * @param {String} col The colour to draw
	 * @param {Boolean} toClear Whether to clear the area before
	 * drawing the rectangle. This is needed when drawing squares with alpha.
	 * @private
	 */
	var drawSquare = function(r, c, col, toClear){
		this.ctx.fillStyle = col;
		var w = this.canvas.width / this.conf.cols;
		var h = this.canvas.height / this.conf.rows;
		var x = Math.floor(c * w);
		var y = Math.floor(r * h);
		w = Math.ceil(w); h = Math.ceil(h);
		if(toClear){
			this.ctx.clearRect(x, y, w, h);
		}
		this.ctx.fillRect(x, y, w, h);
	};


	/**
	 * Converts the given magnitude value into a renderable colour.
	 *
	 * @method magToCol
	 * @param {Number} mag The magnitude value, normally between -1 and 1,
	 * but may extend out of those bounds. For the purposes of plotting
	 * a 'flat calm' magnitude is value zero, and very large waves will have
	 * peaks and troughs at magnitudes 1 and -1 respectively.
	 * @param {Object} base The base colour to derive from.
	 * @param {Boolean} alpha Whether to include an alpha component.
	 * @param {Object} col The colour object to update. This is the output
	 * of the function.
	 * @private
	 */
	var magToCol = function(mag, base, alpha, col){
		// Calculate alpha component if used
		if(alpha < 1){
			col.a = Utils.boundVal(alpha + (Math.abs(mag) * (1 - alpha)), 0, 1);
			// Convert mag into a number that represents either the
			// positive or nevative side of the wave, opacity will do the shading
			mag = mag < 0 ? 0.8 : 1.2;
		}else{
			mag += 1; // Convert to value between 0 and 2
		}
		col.r = ~~Utils.boundVal(base.r * mag, 0, 255);
		col.g = ~~Utils.boundVal(base.g * mag, 0, 255);
		col.b = ~~Utils.boundVal(base.b * mag, 0, 255);
	};


	/**
	 * Add event handlers to allow manually generated waves and pausing
	 *
	 * @method addHandlers
	 * @private
	 */
	var addHandlers = function(){
		var self = this, clickTime, releaseTime, pos;
		self.canvas.onmousedown = function(e){
			clickTime = new Date().getTime();
			pos = toGridPos.call(self, e.clientX, e.clientY);
		};
		self.canvas.onmouseup =function(){
			if(!clickTime){ return; }
			releaseTime = new Date().getTime();
			self.addRipple(pos, releaseTime - clickTime);
			clickTime = 0;
			pos = null;
		};
		// If the mouse moves out of the cell that it is generating a ripple
		// for, then release the current one and start a new one
		self.canvas.onmousemove = function(e){
			if(!clickTime){ return; }
			var p = toGridPos.call(self, e.clientX, e.clientY);
			if(p.r !== pos.r || p.c !== pos.c){
				releaseTime = new Date().getTime();
				self.addRipple(pos, releaseTime - clickTime);
				clickTime = releaseTime;
				pos = p;
			}
		};
		// Pause on space
		document.body.onkeydown = function(e){
			if(e.keyCode === 32){
				self.isPaused = !self.isPaused;
			}
		};
	};


	/**
	 * Convert a canvas position to a wave model grid position.
	 *
	 * @method toGridPos
	 * @param {Number} x The canvas x position.
	 * @param {Number} y The canvas y position.
	 * @return {Object} A grid position object with attributes r and c
	 * @private
	 */
	var toGridPos = function(x, y){
		return {
			r:~~(y * this.conf.rows / this.canvas.height),
			c:~~(x * this.conf.cols / this.canvas.width)
		};
	};


	// Preset WaveSim configs, specifies
	// colour, resolution and sim-step
	WaveSim.Conf = {
		SWIMMING_POOL:{
			interactive : false,
			baseCol     : {r:19, g:128, b:187},
			opacity     : 1,
			stepPeriod  : 30,
			rows        : 200,
			cols        : 200
		},
		SHIMMER:{
			interactive : true,
			baseCol     : {r:128, g:128, b:128},
			opacity     : 0,
			stepPeriod  : 50,
			rows        : 200,
			cols        : 200
		}
	};


	// Return constructor
	return WaveSim;

})();





/**
 * Represents the simulation state, and operations that update the state.
 *
 * @class WaveModel
 */
var WaveModel = (function(){


	// (0-0.1)The level of influence the forces have on the change in speed
	// at each iteration. A higher number causes the waves to propegate faster
	// though the system. The resulting wave pattern not affected by this.
	var FORCE_INFLUENCE = 0.1;


	/**
	 * Construct a new wave model with the given properties and config.
	 *
	 * @constructor
	 * @param {Number} rows The number of rows in the cellular model.
	 * @param {Number} cols The number of columns in the cellular model.
	 * @param {Object} conf The configuration object. See WaveModel.Conf
	 * for examples. The default is WaveModel.Conf.DRIZZLE.
	 */
	var WaveModel = function(rows, cols, conf){
		this.rows = rows;
		this.cols = cols;
		this.conf = conf || WaveModel.Conf.DRIZZLE;
		// Initialise the model grid
		this.F  = Utils.numArray2D(rows, cols); // Force applied to the cell
		this.V  = Utils.numArray2D(rows, cols); // Current velocity of each cell
		this.V_ = Utils.numArray2D(rows, cols); // Velocity update
		this.M  = Utils.numArray2D(rows, cols); // Curent magnitude (amplitude) of each cell
		this.M_ = Utils.numArray2D(rows, cols); // Magnitude update
		// Force generators
		this.ripples = [];
		this.ripples_ = [];
		this.nRipples = 0;
		// If ripplesToGen is less than zero it indicates that they
		// should be generated once at the beginning
		this.ripplesToGen = conf.ripples < 0 ? -conf.ripples : 0;
	};


	/**
	 * Execute the next step of the wave model's state by calculating each
	 * cell's new state relative to its neigbour's current state.
	 *
	 * @method modelStep
	 */
	WaveModel.prototype.modelStep = function(){
		// Create local references for better performance
		var rows = this.rows, cols = this.cols, conf = this.conf;
		var F = this.F, V = this.V, V_ = this.V_, M = this.M, M_ = this.M_;
		// Create function to access neighbours' magnitude values
		var getM = getterFactory.call(this, 'M', 0);
		var r, c;
		// Calculate new values for: force -> velocity -> magnitude
		for(r = 0; r < rows; r++){
			for(c = 0; c < cols; c++){
				// Dampen the velocity according the damping factor
				V_[r][c] = V[r][c] * (1 - conf.damping);
				// Calculate the force acting on this cell
				// 50% of the force is the cell trying to return to zero magnitude
				// And 50% caused by the cell trying to reach a magnidute equal
				// to the average of its neighbours
				F[r][c] += - M[r][c] * (4 + 4 * Math.PI) +
					getM(r - 1, c - 1) +
					getM(r    , c - 1) * Math.PI +
					getM(r + 1, c - 1) +
					getM(r - 1, c    ) * Math.PI +
					getM(r + 1, c    ) * Math.PI +
					getM(r - 1, c + 1) +
					getM(r    , c + 1) * Math.PI +
					getM(r + 1, c + 1);
				// Change the velocity according to the force being applied
				V_[r][c] += F[r][c] * FORCE_INFLUENCE;
				// Move this cell according to the velocity for the cell
				M_[r][c] = M[r][c] + V_[r][c];

				// Set additional force to zero
				F[r][c] = 0;
			}
		}
		// Swap V with V_ and M with M_
		this.V = V_; this.V_ = V;
		this.M = M_; this.M_ = M;
	};


	/**
	 * Generate forces applied to each cell from outside influences.
	 * Normally this should be called before each call to modelStep(),
	 * but is optional. It may be omitted for example, when an alternative
	 * source of disturbance is being used.
	 *
	 * @method genForces
	 */
	WaveModel.prototype.genForces = function(){
		var ripples = this.ripples, ripples_ = this.ripples_;
		var nRipples = this.nRipples, conf = this.conf;
		// If configured to create new ripples on each step then add them
		if(conf.ripples > 0){
			this.ripplesToGen += conf.ripples;
		}
		// Generate new ripples until ripplesToGen falls below 1
		while(this.ripplesToGen >= 1){
			// Create new ripples
			ripples[nRipples++] = new Ripple(this);
			this.ripplesToGen--;
		}
		// Apply ripple forces to the F matrix
		for(var i = 0, j = 0; i < nRipples; i++){
			if(ripples[i].applyForce()){
				// If force applied, copy to secondary array to use on next iteration
				ripples_[j++] = ripples[i];
			}
		};
		// Swap ripples arrays around
		this.ripples = ripples_;
		this.ripples_ = this.ripples;
		this.nRipples = j;
	};


	/**
	 * Manually insert a new ripple into the model.
	 *
	 * @method insertRipple
	 * @param {Ripple} ripple The ripple object to insert
	 */
	WaveModel.prototype.insertRipple = function(ripple){
		this.ripples[this.nRipples++] = ripple;
	};


	/**
	 * Returns a getter function for the given cell-based property
	 * which returns the given default value when the cell address
	 * passed is out of bounds.
	 *
	 * @method getterFactory
	 * @return {function} A function which takes a row and column index
	 * and returns the cell value at that position, or the default value
	 * it the adress is not valud.
	 */
	var getterFactory = function(propName, defValue){
		var cells = this[propName];
		var isTorus = this.conf.isTorus;
		var rows = this.rows;
		var cols = this.cols;
		return function(r, c){
			// On a Torus space, return the square at the opposite end of the board
			if(isTorus){
				r = Utils.mod(r, rows);
				c = Utils.mod(c, cols);
			// On a non-torus square, magnitude of the edges is zero
			}else{
				if(r < 0 || r >= rows || c < 0 || c >= cols){
					return defValue;
				}
			}
			return cells[r][c];
		};
	};


	// WaveModel preset configs
	WaveModel.Conf = {
		TEST:{
			isTorus    : false,
			ripples    : -1,
			wavelength : 40,
			magnitude  : 200,
			damping    : 0.05,
			spawnCol   : 0.95,
			spawnRow   : 0.03,
		},
		DRIZZLE:{
			isTorus    : false,
			ripples    : 1/20,
			wavelength : 10,
			magnitude  : -20,
			damping    : 0.02,
			spawnCol   : NaN,
			spawnRow   : NaN,
		},
		STORM:{
			isTorus    : false,
			ripples    : 1,
			wavelength : 10,
			magnitude  : -30,
			damping    : 0.01,
			spawnCol   : NaN,
			spawnRow   : NaN,
		},
		TSUNAMI:{
			isTorus    : false,
			ripples    : -1, // A single drop
			wavelength : 40,
			magnitude  : 30,
			damping    : 0,
			spawnCol   : NaN,
			spawnRow   : NaN,
		},
		OCEAN:{
			isTorus    : true,
			ripples    : -20, // Create 20 random points
			wavelength : -80,
			magnitude  : -10,
			damping    : 0,
			spawnCol   : NaN,
			spawnRow   : NaN,
		}
	};


	// Return constructor
	return WaveModel;

})();





/**
 * Represents a ripple generating force applied to a specific model cell.
 * Ripple objects are created for each new ripple generated in the system, and
 * are cleared once the ripple has been generated.
 *
 * @class Ripple
 */
var Ripple = (function(){


	/**
	 * Create a new ripple that operates on a single model cell.
	 *
	 * @constructor
	 * @param {WaveModel} model The wave model the ripple is acting on.
	 */
	var Ripple = function(model){
		this.model = model;
		this.init();
	};


	/**
	 * Initialise the ripple with appropriate wavelength, magnitude and row/col positions
	 *
	 * @method init
	 */
	Ripple.prototype.init = function(){
		var conf = this.model.conf;
		this.wavelength = 1 + ~~(conf.wavelength < 0 ? Math.random() * -conf.wavelength : conf.wavelength);
		this.iWave = this.wavelength;
		this.r = ~~((isNaN(conf.spawnRow) ? Math.random() : conf.spawnRow) * this.model.rows);
		this.c = ~~((isNaN(conf.spawnCol) ? Math.random() : conf.spawnCol) * this.model.cols);
		this.mag = conf.magnitude < 0 ? Math.random() * -conf.magnitude : conf.magnitude;
	};


	/**
	 * Generates an appropriate ripple force at the location of this ripple
	 *
	 * @method applyForce
	 * @return {Boolean} true if the ripple has not yet completed its cycle
	 */
	Ripple.prototype.applyForce = function(){
		// Create a clean ripple by graudally applying positive, then negative
		// force to the cell
		var wavePos = (this.wavelength - this.iWave) / this.wavelength;
		this.model.F[this.r][this.c] = this.mag * Math.sin(wavePos * Math.PI * 2);
		this.iWave--;
		return this.iWave !== 0;
	};


	// Return constructor
	return Ripple;

})();





/**
 * A collection of additional utilities.
 *
 * @class Utils
 */
var Utils = (function(){


	// Constructor
	Utils = function(){};


	/**
	 * Initialises a two-dimensional number array with the given value.
	 *
	 * @method numArray2D
	 * @param {Number} rows The number of rows in 2D grid.
	 * @param {Number} cols The number of columns in 2D grid.
	 * @param {Number} val The numeric value to initialise the array with.
	 * @return {Array[Array[Number]]} The initialised 2D array
	 * @static
	 */
	Utils.numArray2D = function(rows, cols, val){
		return Array.apply(null, Array(rows)).map(function(){
			return Utils.numArray(cols, val);
		});
	};


	/**
	 * Initialises a simple number array with the given value.
	 *
	 * @method numArray2D
	 * @param {Number} size The array length
	 * @param {Number} val The numeric value to initialise the array with.
	 * @return {Array[Number]} The initialised array
	 * @static
	 */
	Utils.numArray = function(size, val){
		val = val || 0;
		return Array.apply(null, Array(size)).map(Number.prototype.valueOf, val);
	};


	/**
	 * Calculate the modulus of a number.
	 *
	 * @method mod
	 * @param {Number} n The number to calculate the modulus for
	 * @param {Number} m Calculate to mod m
	 * @return {Number} The value of "n mod m"
	 * @static
	 */
	Utils.mod = function(n, m){
		// Requires two % operations for negative numbers
		return n >= 0 ? n % m : ((n % m) + m) % n;
	};


	/**
	 * Returns a value n derived from v, such that
	 *
	 *     min <= n <= max
	 *
	 * @method boundVal
	 * @param {Number} v The value to apply bounds to
	 * @param {Number} min The lower bound (inclusive)
	 * @param {Number} max The upper bound (inclusive)
	 * @return {Number} The bounded value
	 * @static
	 */
	Utils.boundVal = function(v, min, max){
		return Math.max(Math.min(v, max), min);
	};


	// Return constructor
	return Utils;

})();


/*
// On page load, create a WaveSim overlay and start simulation
window.addEventListener('load', function(){
	var sim = new WaveSim(WaveSim.Conf.SHIMMER);
	sim.start(WaveModel.Conf.DRIZZLE);
}, false );
*/
