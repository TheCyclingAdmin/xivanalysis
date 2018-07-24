import React, {Fragment} from 'react'

import {ActionLink} from 'components/ui/DbLink'
import ACTIONS from 'data/ACTIONS'
import STATUSES from 'data/STATUSES'
import Module from 'parser/core/Module'
import {Rule, Requirement} from 'parser/core/modules/Checklist'
import {Suggestion, SEVERITY} from 'parser/core/modules/Suggestions'


const WASTED_USES_MAX_MINOR = 3
const WASTED_USES_MAX_MEDIUM = 10

export default class Benison extends Module {
	static handle = 'benison'
	static dependencies = [
		'checklist',
		'combatants',
		'cooldowns',
		'enemies',
		'invuln',
		'suggestions',
	]

	_lastUse = 0
	_uses = 0
	_totalHeld = 0

	constructor(...args){
		super(...args)

		const _filter = {
			by: 'player',
			abilityId: [ACTIONS.DIVINE_BENISON.id],
		}
		this.addHook('cast', _filter, this._onApplyBenison)
		this.addHook('complete', this._onComplete)
	}

	_onApplyBenison(event){
		this._uses++
		if(this._lastUse === 0) { this._lastUse = this.parser.fight.start_time }

		const _held = event.timestamp - this._lastUse - (ACTIONS.DIVINE_BENISON.cooldown * 1000)
		if (_held > 0) {
			this._totalHeld += _held
		}
		//update the last use
		this._lastUse = event.timestamp
	}

	_onComplete(){
		if (this._uses === 0){
			this.suggestions.add(new Suggestion({
				icon: ACTIONS.DIVINE_BENISON.icon,
				content: <Fragment>
					Use Divine Benison. Frequent uses of Divine Benison can mitigate a large amount of damage over the course of a fight, potentially resulting in less required healing GCDs.
				</Fragment>,
				severity: SEVERITY.MAJOR,
				why: <Fragment>
					Divine Benison was not used in this fight.
				</Fragment>,
			}))
		} else {
			//uses missed reported in 1 decimal
			const _usesMissed = Math.floor(10 * this._totalHeld / (ACTIONS.DIVINE_BENISON.cooldown * 1000)) / 10
			if (_usesMissed > 1) {
				this.suggestions.add(new Suggestion({
					icon: ACTIONS.DIVINE_BENISON.icon,
					content: <Fragment>
						Use Divine Benison more frequently. Frequent uses of Divine Benison can mitigate a large amount of damage over the course of a fight, potentially resulting in less required healing GCDs.
					</Fragment>,
					severity: _usesMissed <= WASTED_USES_MAX_MINOR ? SEVERITY.MINOR : _usesMissed <= WASTED_USES_MAX_MEDIUM ? SEVERITY.MEDIUM : SEVERITY.MAJOR,
					why: <Fragment>
						Up to {_usesMissed} uses of Divine Benison were missed by holding it for at least a total of {this.parser.formatDuration(this._totalHeld)}.
					</Fragment>,
				}))
			}
		}
	}
}
