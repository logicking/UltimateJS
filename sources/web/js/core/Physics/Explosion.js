var DAMAGE_DECR = 180;
var FORCE_RATING = 100;

// Creates physics explosion without any visual presentation
// just an explosion in physics world.
// center - center of the explosion;
// radiusMin, radiusMax - it`s radius <point>
// force - scalar force of impulse <number>
// damage - scalar force of damage <number>
// duration - explosion effect duration in <ms>
// decr - how fast force decreases by distance from center <number>
// owner - object that initiate explosion, should not affect it
Physics.explode = function(params) { // (center, radius, force, duration,
	// owner, decr) {
	var decr = (params.decr != null) ? params.decr : 1;
	DAMAGE_DECR = (params.damageDecr != null) ? params.damageDecr : 150;
	var world = Physics.getWorld();
	var score = 0;
	var delta = (params.delta > 0) ? params.delta : 20;
	var time = params.duration / delta;
	function tick() {
		setTimeout(function() {
			var body = world.m_bodyList;
			for (; body != null; body = body['m_next']) {
				var bodyCenter = body.GetPosition();
				var rVec = new b2Vec2(bodyCenter.x - params.center.x,
						bodyCenter.y - params.center.y);
				var dist = rVec.Length();
				if (dist < params.radius) {
					var impulse = rVec;
					impulse.Normalize();
					impulse.Multiply(FORCE_RATING * params.force
							/ Math.pow(1 + dist, decr));
					if (body.m_userData) {
						if (body.m_userData.params.id != "CannonBall") {
							body.WakeUp();
							body
									.ApplyImpulse(impulse, body
											.GetPosition());
							body.AllowSleeping(true);
						}
					}

					if ((body.m_userData) && (body.m_userData.destructable)) {
						var damage = impulse.Length() / DAMAGE_DECR;
						body.m_userData.onDamage(damage);
						score += damage;
					}
				}
				;
			}
			;
			if (time < params.duration)
				tick();
			time += delta;
		}, 5);
	}
	;
	tick();
};