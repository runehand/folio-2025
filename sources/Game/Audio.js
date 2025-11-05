import { Howl, Howler } from 'howler'
import { Game } from './Game.js'
import { remap, remapClamp, clamp } from './utilities/maths.js'

export class Audio
{
    constructor()
    {
        this.game = Game.getInstance()

        this.groups = new Map()

        this.setMusic()
        this.setAmbiants()
        this.setMuteToggle()

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 12)
    }

    init()
    {
        this.music.play()
    }

    register(name, path, options = {}, binding = null)
    {
        const item = {}
        item.howl = new Howl({
            src: [ path ],
            pool: 1,
            // autoplay: true,
            // loop: true,
            // volume: 1
            ...options
        })
        item.rate = 1
        item.volume = 0
        item.binding = binding

        // Save into groups
        let group = this.groups.get(name)

        if(!group)
        {
            group = []
            this.groups.set(name, group)
        }
        group.push(item)

        return item
    }

    setMusic()
    {
        this.music = new Howl({
            src: ['sounds/musics/wild-serenity.wav'],
            pool: 0,
            autoplay: false,
            loop: true,
            volume: 0.15
        })
    }

    setAmbiants()
    {
        this.register(
            'wind',
            'sounds/wind/13582-wind-in-forest-loop.wav',
            { autoplay: true, loop: true, volume: 0 },
            (item) =>
            {
                item.volume = Math.pow(remapClamp(this.game.weather.wind.value, 0.3, 1, 0, 1), 3) * 0.5
            }
        )

        this.register(
            'rain',
            // 'sounds/rain/rain-on-umbrella.wav',
            'sounds/rain/soundjay_rain-on-leaves_main-01.wav',
            { autoplay: true, loop: true, volume: 0 },
            (item) =>
            {
                item.volume = Math.pow(this.game.weather.rain.value, 2)
            }
        )

        this.register(
            'waves',
            'sounds/waves/lake-waves.wav',
            { autoplay: true, loop: true, volume: 0 },
            (item) =>
            {
                const distanceToSide = Math.min(
                    this.game.terrain.size / 2 - Math.abs(this.game.player.position.x),
                    this.game.terrain.size / 2 - Math.abs(this.game.player.position.z)
                )
                item.volume = Math.pow(remapClamp(distanceToSide, 0, 40, 1, 0.1), 2) * 0.5
            }
        )

        this.register(
            'wheels',
            'sounds/wheels/Source Stone Loop Small Rubbing Pebbles On Rubber 01.wav',
            { autoplay: true, loop: true, volume: 0 },
            (item) =>
            {
                const defaultElevation = 1.08
                const elevationEffect = remapClamp(Math.abs(this.game.physicalVehicle.position.y - defaultElevation), 0, 2, 1, 0)
                const speedEffect = Math.min(1, this.game.physicalVehicle.xzSpeed * 0.1)
                // console.log(speedEffect)
                item.volume = elevationEffect * speedEffect * 0.15
                item.rate = 1.15
            }
        )

        this.register(
            'drift',
            // 'sounds/drift/26348 Dragging wooden log on gravel road loop-full.wav',
            // 'sounds/drift/41046 Glass stone turning loop 04-full.wav',
            // 'sounds/drift/Earth Loop Dumping Gravel Sack Bulk Falling 01.wav',
            'sounds/drift/Source Stone Loop Small Rubbing Pebbles On Concrete 02.wav',
            { autoplay: true, loop: true, volume: 0 },
            (item) =>
            {
                const directionRatio = (1 - Math.abs(this.game.physicalVehicle.forwardRatio)) * 0.3
                
                let brakeEffect = Math.max(directionRatio, this.game.player.braking) * this.game.physicalVehicle.xzSpeed * 0.15 * this.game.physicalVehicle.wheels.inContactCount / 4
                brakeEffect = clamp(brakeEffect, 0, 1)

                const volume = brakeEffect * 0.4
                const delta = volume - item.volume

                if(delta > 0)
                    item.volume += delta * this.game.ticker.delta * 40
                else
                    item.volume += delta * this.game.ticker.delta * 10
                
                item.rate = 1
            }
        )

        this.register(
            'drift',
            // 'sounds/drift/26348 Dragging wooden log on gravel road loop-full.wav',
            // 'sounds/drift/41046 Glass stone turning loop 04-full.wav',
            'sounds/drift/Earth Loop Dumping Gravel Sack Bulk Falling 01.wav',
            // 'sounds/drift/Source Stone Loop Small Rubbing Pebbles On Concrete 02.wav',
            { autoplay: true, loop: true, volume: 0 },
            (item) =>
            {
                item.volume = this.groups.get('drift')[0].volume * 0.6
                
                item.rate = 1.2
            }
        )

        this.register(
            'engine',
            'sounds/engine/muscle car engine loop idle.wav',
            { autoplay: true, loop: true, volume: 0 },
            (item) =>
            {
                const accelerating = Math.abs(this.game.player.accelerating) * 0.5
                const boosting = this.game.player.boosting + 1
                const volume = Math.max(0.05, accelerating * boosting * 0.7)
                const delta = volume - item.volume
                const easing = delta > 0 ? 20 : 5
                
                item.volume += delta * this.game.ticker.delta * easing

                const rate = remapClamp(accelerating * boosting, 0, 1, 0.6, 1.1)
                item.rate += (rate - item.rate) * this.game.ticker.delta * 10
            }
        )

        // this.register(
        //     'energy',
        //     'sounds/energy/Energy_-_force_field_15_loop.wav',
        //     { autoplay: true, loop: true, volume: 0 },
        //     (item) =>
        //     {
        //         const accelerating = 0.5 + Math.abs(this.game.player.accelerating) * 0.5
        //         const boosting = this.game.player.boosting
        //         const volume = accelerating * boosting * 0.5
        //         const delta = volume - item.volume
        //         const easing = delta > 0 ? 20 : 5
                
        //         item.volume += delta * this.game.ticker.delta * easing

        //         const rate = 1 + Math.abs(this.game.player.accelerating) * 0.5
        //         item.rate += (rate - item.rate) * this.game.ticker.delta * 10
        //     }
        // )

        // this.register(
        //     'energy',
        //     'sounds/energy/Energy_-_force_field_6_loop.wav',
        //     { autoplay: true, loop: true, volume: 0 },
        //     (item) =>
        //     {
        //         const accelerating = 0.5 + Math.abs(this.game.player.accelerating) * 0.5
        //         const boosting = this.game.player.boosting
        //         const volume = accelerating * boosting * 0.2
        //         const delta = volume - item.volume
        //         const easing = delta > 0 ? 20 : 5
                
        //         item.volume += delta * this.game.ticker.delta * easing
        //     }
        // )
    }

    setMuteToggle()
    {
        this.muteToggle = {}
        this.muteToggle.buttonElement = this.game.domElement.querySelector('.audio-toggle')

        this.muteToggle.active = true

        this.muteToggle.toggle = () =>
        {
            if(this.muteToggle.active)
                this.muteToggle.deactivate()
            else
                this.muteToggle.activate()
        }

        this.muteToggle.activate = () =>
        {
            if(this.muteToggle.active)
                return
            
            Howler.mute(false)
            this.muteToggle.active = true
            this.muteToggle.buttonElement.classList.add('is-active')
            localStorage.setItem('soundToggle', '1')
        }

        this.muteToggle.deactivate = () =>
        {
            if(!this.muteToggle.active)
                return
            
            Howler.mute(true)
            this.muteToggle.active = false
            this.muteToggle.buttonElement.classList.remove('is-active')
            localStorage.setItem('soundToggle', '0')
        }

        const soundToggleLocal = localStorage.getItem('soundToggle')
        if(soundToggleLocal !== null && soundToggleLocal === '0')
            this.muteToggle.deactivate()

        this.muteToggle.buttonElement.addEventListener('click', this.muteToggle.toggle)
    }

    update()
    {
        const globalRate = this.game.time.scale / this.game.time.defaultScale
        this.groups.forEach((group) =>
        {
            for(const item of group)
            {
                if(typeof item.binding === 'function')
                {
                    item.binding(item)
                    item.howl.rate(item.rate * globalRate)
                    item.howl.volume(item.volume)
                }
            }
        })
    }
}
