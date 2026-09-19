window.addEventListener('DOMContentLoaded', () => {
	// Canvas Setup
	const canvas = document.getElementById('canvas') || 
		document.querySelector('canvas');
	const ctx = canvas.getContext('2d');

	// Responsive Canvas Sizing with non-zero fallback
	function resizeCanvas() {
		canvas.width = window.innerWidth || 800;
		canvas.height = window.innerHeight || 600;
	}
	resizeCanvas();
	window.addEventListener('resize', resizeCanvas);

	// Core Configuration & Spectrum Setup
	const config = {
		speed: 1.0,
		gravity: 9.8
	};

	const roygbivSpectrum = [0, 30, 60, 120, 240, 275, 300]; 
	let currentSpectrumIndex = 0;

	//asset load layers 1 & 3
	const bgImage = new Image();
	bgImage.src = 'cannonLeft.png';

	const fgCannonImage = new Image();
	fgCannonImage.src = 'cannonRight.png'; 

	// Timeline & Physics Engine States
	let lastTime = performance.now();
	let rocketStage = 0; // 0 = Ascending, 1 = Blooming
	let rocketY = canvas.height;
	let centerTimeline = 0;

	// Spinner Particle Storage
	const activeSpinners = [];

	// Mutation State Tracking
	const centerMutationState = {
		gen1Branches: 5,
		gen2Branches: 4,
		gen3Branches: 3,
		mutantTargetIndex: 0
	};

	// Central star physics state
	const centerStar = {
		x: canvas.width * 0.15, // start near left
		y: canvas.height * 0.6,
		velocityX: -3.5,        // negative x -> left
		velocityY: -12.0,       // upward burst
		gravity: 0.35,          // downward acceleration
		rotation: 0,
		spinSpeed: 0.05,        // continuous spin rate
		radius: 40,
		hue: 45
	};

	function animateCenterStar() {
		// 1. Move along parabola
		centerStar.x += centerStar.velocityX;
		centerStar.y += centerStar.velocityY;
		centerStar.velocityY += 
			centerStar.gravity;

		// 2. Continuous rotation
		centerStar.rotation += 
			centerStar.spinSpeed;

		// 3. Spawn child particles along path
		if (Math.random() < 0.4) {
			spawnArcBurstCluster(
				centerStar.x,
				centerStar.y,
				centerStar.radius,
				centerStar.hue,
				3
			);
		}

		// 4. Render the star at current position
		drawSpinnerGraphic(
			centerStar.x,
			centerStar.y,
			centerStar.radius,
			1.0,
			centerStar.rotation,
			centerStar.hue
		);
	}
	function updateCenterStar() {
		// Parabolic position updates
		centerStar.x += centerStar.velocityX;
		centerStar.y += centerStar.velocityY;
		
		// Apply gravity to vertical speed
		centerStar.velocityY += centerStar.gravity;

		// Continuous spinning motion
		centerStar.rotation += centerStar.spinSpeed;

		// Optional: Spawn tip stars along the flight path
		if (Math.random() < 0.4) {
			spawnArcBurstCluster(
				centerStar.x,
				centerStar.y,
				centerStar.radius,
				centerStar.hue,
				3
			);
		}
	}

	function triggerCenterMutation() {
		centerMutationState.gen1Branches = 
			Math.floor(Math.random() * 5) + 4;
		centerMutationState.gen2Branches = 						Math.floor(Math.random() * 4) + 4;
		centerMutationState.gen3Branches = 
			Math.floor(Math.random() * 3) + 4;
		centerMutationState.mutantTargetIndex = 				Math.floor(
			Math.random() * centerMutationState.gen1Branches);
	}

	
	// Draw central star at negative/offscreen coords
	drawSpinnerGraphic(
		centerStar.x,
		centerStar.y,
		centerStar.radius,
		1.0,                 // opacity
		centerStar.rotation,
		centerStar.hue
	);

	function spawnTipFlungStar(tipX, tipY, throwAngle, 
	hue, parentRadius) {
		//tangential fling direction 
		//(perpendicular to radial angle + noise)
		const flingAngle = throwAngle + (Math.PI / 2) + 				((Math.random() - 0.5) * 0.4);
		const throwSpeed = 4 + Math.random() * 6;

		activeSpinners.push({
			originX: tipX,
			originY: tipY,
			velocityX: Math.cos(flingAngle) * throwSpeed,
			velocityY: Math.sin(flingAngle) * throwSpeed - 
			//initial upward float
			(1 + Math.random() * 3),
			gravityScalar: 0.75 + Math.random() * 0.5,
			birthTime: performance.now(),
			//spawn instantly on passing tip
			delayOffset: 0, 
			baseSpinMultiplier: 0.6 + Math.random() * 0.8,
			sizeJitter: 0.7 + Math.random() * 0.6,
			//scale down, relative to the central star
			radius: parentRadius * 0.2, 
			baseHue: hue
		});
	}

	//launch child particles when stage 1  is complete
	function launchParabolicGeneration(
	depth, originX, originY, baseRadius, limit) {
		const count = 12;
		for (let i = 0; i < count; i++) {
			const angle = (i / count) * Math.PI * 2;
			const speed = 5 + Math.random() * 5;
			activeSpinners.push({
				originX: originX,
				originY: originY,
				velocityX: Math.cos(angle) * 
				speed,
				// Upward burst
				velocityY: Math.sin(angle) *
				speed - 5,
				birthTime: performance.now(),
				delayOffset: Math.random() * 100,
				baseSpinMultiplier: 0.8 + 
				Math.random() * 0.4,
				sizeJitter: 0.8 + Math.random() *
				0.4,
				radius: baseRadius * 0.3,
				baseHue: 								roygbivSpectrum[
				currentSpectrumIndex] || 0
			});
		}
	}
	function spawnArcBurstCluster(
	centerX, centerY,
	starRadius, hue,count) {
		// Arc limits between 7:00 (125 deg) 
		// and 12:00 (270 deg)
		const minAngle = 125 * (Math.PI / 180);
		const maxAngle = 270 * (Math.PI / 180);

		for (let i = 0; i < count; i++) {
			const randomProgress = Math.random();
			const arcAngle = minAngle + 
				(randomProgress * 
				(maxAngle - minAngle));

			const distanceOffset = 
				starRadius * 
				(0.8 + Math.random() * 0.4);

			const spawnX = centerX + 
				Math.cos(arcAngle) * 
				distanceOffset;
			const spawnY = centerY + 
				Math.sin(arcAngle) * 
				istanceOffset;

			spawnTipFlungStar(
			spawnX, spawnY, arcAngle,
			hue, starRadius);
		}
	}

// Main Physics and Frame Rendering Loop
	function renderLoop() {
		const now = performance.now();
		let deltaTime = (now - lastTime) * 0.001;
		lastTime = now;

		let currentStarAngle = 
			performance.now() * 0.005;

		if (deltaTime > 0.1) deltaTime = 0.016;

		// background layer behind everything
		ctx.fillStyle = 'rgba(4, 4, 12, 0.12)';
		ctx.fillRect(
			0, 
			0, 
			canvas.width, 
			canvas.height
		);

		// background image sheet
		if (
			bgImage.complete && 
			bgImage.width > 0
		) {
			ctx.save();
			const bgScaleY = 
				canvas.width / bgImage.width;
			const bgScaledHeight = 
				bgImage.height * bgScaleY;
			const bgY = 
				canvas.height - bgScaledHeight;
			ctx.drawImage(
				bgImage, 
				0, 
				bgY, 
				canvas.width, 
				bgScaledHeight
			);
			ctx.restore();
		}

		const screenCenterX = canvas.width / 2;
		const screenCenterY = canvas.height / 2;
		const globalBoundaryLimit = 
			Math.max(canvas.width, canvas.height) * 
			0.24;

		// STAGE 0 central animation, ascend and explode
		if (rocketStage === 0) {
			rocketY -= 
				deltaTime * (canvas.height * 0.65);
			
			// Growth math: starts at size 4 near floor,
			// grows to size 14 near center
			const rocketProgress = Math.min(
				1.0, 
				Math.max(
					0, 
					(canvas.height - rocketY) / 
					(screenCenterY)
				)
			);
			const growingRocketRadius = 
				4 + (rocketProgress * 10);
			
			const targetHue = 
				roygbivSpectrum[
					currentSpectrumIndex
				] || 0;

			// draw growing, static star
			drawSpinnerGraphic(
				screenCenterX, 
				rocketY, 
				growingRocketRadius, 
				1.0, 
				0, 
				targetHue, 
				true
			);

			if (rocketY <= screenCenterY) {
				rocketStage = 1;
				centerTimeline = 0;
			}
		}

		// track previous frame's rotation angle
		if (
			typeof window.previousStarAngle === 
			'undefined'
		) {
			window.previousStarAngle = 0;
		}

		// ==========================================
		// STAGE 1: PARABOLIC CENTER STAR
		// ==========================================
		if (rocketStage === 1) {
			centerTimeline += 
				deltaTime * 0.75 * config.speed;

			// Animate and draw parabolic star
			animateCenterStar();

			// Transition out when growth completes
			if (centerTimeline >= 1.0) {
				centerTimeline = 0;
				rocketStage = 0;
				rocketY = canvas.height;

				currentSpectrumIndex = 
					(currentSpectrumIndex + 1) % 
					roygbivSpectrum.length;

				triggerCenterMutation();
			}
		}

		// active falling spinners
		for (
			let i = activeSpinners.length - 1; 
			i >= 0; 
			i--
		) {
			const cell = activeSpinners[i];
			const activeRunningTime = 
				now - cell.birthTime;

			if (activeRunningTime < cell.delayOffset) {
				continue;
			}

			const physicsAge = 
				(activeRunningTime - cell.delayOffset) * 
				0.001;
			let targetX = 
				cell.originX + 
				(cell.velocityX * physicsAge * 60);
			
			const verticalVelocityComponent = 
				cell.velocityY * physicsAge;
			const gravityComponent = 
				0.5 * config.gravity * 
				physicsAge * physicsAge;
			let targetY = 
				cell.originY + 
				((verticalVelocityComponent + 
					gravityComponent) * 35);
			
			let cellFadeFactor = Math.max(
				0, 
				1.0 - (physicsAge * 0.48)
			);

			const currentInstantaneousVelocityY = 
				cell.velocityY + 
				(config.gravity * physicsAge);
			const isAscending = 
				currentInstantaneousVelocityY < 0;

			if (
				isAscending && 
				targetY > (canvas.height / 2)
			) {
				cellFadeFactor = 0;
			}

			const dynamicSpinSpeed = 
				(now * 0.002 * cell.baseSpinMultiplier) + 
				(Math.abs(
					currentInstantaneousVelocityY
				) * 0.012);
			const dynamicRadius = 
				cell.radius * 
				cell.sizeJitter * 
				(0.95 + Math.sin(now * 0.04 + i) * 0.05);

			drawSpinnerGraphic(
				targetX,
				targetY, 
				dynamicRadius,
				cellFadeFactor, 
				dynamicSpinSpeed,
				cell.baseHue
			);

			if (
				targetY > canvas.height + 60 || 
				cellFadeFactor <= 0
			) {
				activeSpinners.splice(i, 1);
			}
		}

		// foreground on top
		if (
			fgCannonImage.complete && 
			fgCannonImage.width > 0
		) {
			ctx.save();
			const fgScaleY = 
				canvas.width / fgCannonImage.width;
			const fgScaledHeight = 
				fgCannonImage.height * fgScaleY;
			const fgY = 
				canvas.height - fgScaledHeight;
			ctx.drawImage(
				fgCannonImage, 
				0, 
				fgY, 
				canvas.width, 
				fgScaledHeight
			);
			ctx.restore();
		}

		requestAnimationFrame(renderLoop);
	}
	// Kick off initial state and render loop
	triggerCenterMutation();
	rocketY = canvas.height;
	lastTime = performance.now();
	requestAnimationFrame(renderLoop);
});
