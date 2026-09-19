
(Math.random() * 5) + 4;
		centerMutationState.gen2Branches = Math.floor(Math.random() * 4) + 4;
		centerMutationState.gen3Branches = Math.floor(Math.random() * 3) + 4;
		centerMutationState.mutantTargetIndex = Math.floor(Math.random() * centerMutationState.gen1Branches);
	}

	// Main Physics and Frame Rendering Loop
	function renderLoop() {
		const now = performance.now();
		const deltaTime = (now - lastTime) * 0.001;
		lastTime = now;

		// Clear drawing boundaries and refresh neon motion slipstreams
		ctx.fillStyle = 'rgba(4, 4, 12, 0.12)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		if (bgImage.complete) {
			const bgScaleY = canvas.width / bgImage.width;
			const bgScaledHeight = bgImage.height * bgScaleY;
			const bgY = canvas.height - bgScaledHeight;
			ctx.drawImage(bgImage, 0, bgY, canvas.width, bgScaledHeight);
			ctx.fillStyle = 'rgba(4, 4, 12, 0.12)';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		} else {
			ctx.fillStyle = 'rgba(4, 4, 12, 0.12)';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}

		const screenCenterX = canvas.width / 2;
		const screenCenterY = canvas.height / 2;
		const globalBoundaryLimit = Math.max(canvas.width, canvas.height) * 0.24;

		// ==========================================
		// STAGE 0: ASCENDING PROJECTS ROCKET TIMELINE
		// ==========================================
		if (rocketStage === 0) {
			// Fly upward linearly against the vertical screen dimensions
			rocketY -= deltaTime * (canvas.height * 0.65);
			
			// Draw a single bright white-hot star charging upward
			const rocketRotation = now * 0.006;
			drawSpinnerGraphic(screenCenterX, rocketY, 15, 1.0, rocketRotation, 60); // Golden trail white core rocket

			// TRIPWIRE THRESHOLD: The exact millisecond it strikes the vertical center point, trigger detonation phase
			if (rocketY <= screenCenterY) {
				rocketStage = 1; // Swap engine loop mode over to mitosis expansion blooming shell
				centerTimeline = 0;
			}
		}

		// ==========================================
		// STAGE 1: DYNAMIC SHELL SCALE GROWTH MATRIX
		// ==========================================
		if (rocketStage === 1) {
			centerTimeline += deltaTime * 0.55 * config.speed;
			
			if (centerTimeline >= 1.0) {
				const maxExpandedRadius = 60;
				launchParabolicGeneration(0, screenCenterX, screenCenterY, maxExpandedRadius, globalBoundaryLimit);
				
				// Reset back down to rocket ascent mode to repeat the sequential cascade
				centerTimeline = 0;
				rocketStage = 0;
				rocketY = canvas.height; // Reset rocket floor bounds
				
				currentSpectrumIndex = (currentSpectrumIndex + 1) % roygbivSpectrum.length;
				triggerCenterMutation();
			}

			const coreSpinnerRadius = 5 + (centerTimeline * 55);
			let smoothCenterTimeline = centerTimeline * (2 - centerTimeline);

			const executionTimelineBackup = centerTimeline;
			centerTimeline = smoothCenterTimeline;
			
			buildCenterTree(0, screenCenterX, screenCenterY, coreSpinnerRadius, globalBoundaryLimit);
			
			centerTimeline = executionTimelineBackup;
		}

		// ==========================================
		// STAGE 2A: RENDER ALL ACTIVE FALLING SPINNERS (Behind Foreground Sheet)
		// ==========================================
		for (let i = activeSpinners.length - 1; i >= 0; i--) {
			const cell = activeSpinners[i];
			const activeRunningTime = now - cell.birthTime;
			if (activeRunningTime < cell.delayOffset) continue;

			const physicsAge = (activeRunningTime - cell.delayOffset) * 0.001;
			let targetX = cell.originX + (cell.velocityX * physicsAge * 60);
			
			const verticalVelocityComponent = cell.velocityY * physicsAge;
			const gravityComponent = 0.5 * config.gravity * physicsAge * physicsAge;
			let targetY = cell.originY + ((verticalVelocityComponent + gravityComponent) * 35);
			
			let cellFadeFactor = Math.max(0, 1.0 - (physicsAge * 0.48));

			const currentInstantaneousVelocityY = cell.velocityY + (config.gravity * physicsAge);
			const isAscending = currentInstantaneousVelocityY < 0;

			if (isAscending && targetY > (canvas.height / 2)) {
				cellFadeFactor = 0;
			}

			// VELOCITY-LINKED SPINNING MATH: Faster vertical movement makes stars spin faster
			// VELOCITY-LINKED JITTER MATH: Add random sizing crunch spikes using cell size variables
			const dynamicSpinSpeed = (now * 0.002 * cell.baseSpinMultiplier) + (Math.abs(currentInstantaneousVelocityY) * 0.012);
			const dynamicRadius = cell.radius * cell.sizeJitter * (0.95 + Math.sin(now * 0.04 + i) * 0.05);

			drawSpinnerGraphic(targetX, targetY, dynamicRadius, cellFadeFactor, dynamicSpinSpeed, cell.baseHue);

			if (targetY > canvas.height + 60 || cellFadeFactor <= 0) {
				activeSpinners.splice(i, 1);
			}
		}

		// ==========================================
		// STAGE 2B: ABSOLUTE TOP FOREGROUND MASK PLACEMENT
		// ==========================================
		if (cannonImage.complete) {
			ctx.save();
			const fgScaleY = canvas.width / cannonImage.width;
			const fgScaledHeight = cannonImage.height * fgScaleY;
			const fgY = canvas.height - fgScaledHeight;
			ctx.drawImage(cannonImage, 0, fgY, canvas.width, fgScaledHeight);
			ctx.restore();
		}

		requestAnimationFrame(renderLoop);
	}

	triggerCenterMutation();
	requestAnimationFrame(renderLoop);
});
