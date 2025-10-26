import * as THREE from 'three'
import achievementsData from '../data/achievements.js'
import { Game } from './Game.js'

export class Achievements
{
    constructor()
    {
        this.game = Game.getInstance()

        this.setStorage()
        this.setModal()
        this.setItems()
        this.setGlobalProgress()
        this.setReset()

        this.checkDependents()
    }

    setStorage()
    {
        this.storage = {}

        this.storage.save = () =>
        {
            const data = {}
            this.items.forEach((_achievements, _name) =>
            {
                if(_achievements.progress > 0)
                    data[_name] = _achievements.progress
            })

            const encodedData = JSON.stringify(data)
            localStorage.setItem('achievements', encodedData)
        }

        this.storage.get = () =>
        {
            const localAchievements = localStorage.getItem('achievements')

            if(localAchievements)
            {
                return JSON.parse(localAchievements)
            }

            return {}
        }
    }

    setGlobalProgress()
    {
        this.globalProgress = {}
        this.globalProgress.element = this.modal.instance.element.querySelector('.js-global-progress')
        this.globalProgress.current = this.globalProgress.element.querySelector('.js-current')
        this.globalProgress.total = this.globalProgress.element.querySelector('.js-total')

        this.globalProgress.update = () =>
        {
            let achievedCount = 0
            this.items.forEach(_item => achievedCount += _item.achieved ? 1 : 0)
            
            this.globalProgress.total.textContent = this.items.size
            this.globalProgress.current.textContent = achievedCount
        }

        this.globalProgress.update()
    }

    setItems()
    {
        const localAchievements = this.storage.get()

        this.items = new Map()
        const itemsElement = this.modal.instance.element.querySelector('.js-items')

        for(const [ name, title, description, total ] of achievementsData)
        {
            const achievement = {
                total,
                achieved: false
            }

            // HTML
            const html = /* html */`
                <div class="title">${title}</div>
                <div class="description">
                    <div class="text">${description}</div>
                    <div class="progress">
                        <div class="check-icon"></div>
                        <span class="check"></span>
                        <span class="current">${achievement.progress}</span> / <span>${total}</span>
                    </div>
                </div>
                <div class="bar">
                    <div class="fill"></div>
                </div>
            `

            achievement.itemElement = document.createElement('div')
            achievement.itemElement.classList.add('achievement')
            achievement.itemElement.innerHTML = html

            achievement.progressCurrentElement = achievement.itemElement.querySelector('.current')
            achievement.barFillElement = achievement.itemElement.querySelector('.bar .fill')
            
            itemsElement.append(achievement.itemElement)

            // Achieve
            achievement.achieve = (_silent = true) =>
            {
                achievement.achieved = true
                achievement.itemElement.classList.add('is-achieved')

                if(!_silent)
                {
                    // Confetti
                    if(this.game.world.confetti)
                    {
                        this.game.world.confetti.pop(this.game.player.position.clone())
                        this.game.world.confetti.pop(this.game.player.position.clone().add(new THREE.Vector3(1, -1, 1.5)))
                        this.game.world.confetti.pop(this.game.player.position.clone().add(new THREE.Vector3(1, -1, -1.5)))
                    }
                }
            }


            /**
             * Achievements (parent)
             */
            const achievements = this.items.get(name) ?? this.createAchievementsGroup(name)
            
            achievements.items.push(achievement)
            
            // From local
            achievements.setProgress(localAchievements[ name ] ?? 0, true)
        }
    }

    createAchievementsGroup(name)
    {
        // Create
        const achievements = {
            progress: 0,
            items: []
        }

        // Set progress method
        achievements.setProgress = (_progress, _fromLocal = false) =>
        {
            if(_progress !== achievements.progress || _fromLocal)
            {
                achievements.progress = _progress

                for(const achievement of achievements.items)
                {
                    const progress = Math.min(achievements.progress, achievement.total)

                    // Progress
                    achievement.progressCurrentElement.textContent = progress

                    // Bar
                    achievement.barFillElement.style.transform = `scaleX(${progress / achievement.total})`

                    // Achieved
                    if(!achievement.achieved && progress === achievement.total)
                    {
                        achievement.achieve(_fromLocal)

                        if(!_fromLocal)
                        {
                            this.checkDependents()
                        }

                    }

                    // Storage
                    if(!_fromLocal)
                    {
                        this.storage.save()
                        this.globalProgress.update()
                    }
                }
            }
        }

        // Add progress method
        achievements.addProgress = () =>
        {
            achievements.setProgress(achievements.progress + 1)
        }

        // Reset
        achievements.reset = () =>
        {
            achievements.progress = 0
            for(const achievement of achievements.items)
            {
                achievement.progressCurrentElement.textContent = achievement.progress
                achievement.barFillElement.style.transform = 'scaleX(0)'
                achievement.achieved = false
                achievement.itemElement.classList.remove('is-achieved')
            }
        }

        // Save
        this.items.set(name, achievements)

        // Return
        return achievements
    }

    setModal()
    {
        this.modal = {}
        this.modal.instance = this.game.modals.items.get('achievements')
    }

    setReset()
    {
        const button = this.modal.instance.element.querySelector('.js-button-reset')

        let clickCount = 0

        button.addEventListener('click', (event) =>
        {
            event.preventDefault()
            clickCount++

            if(clickCount === 1)
            {
                button.textContent = 'Are you sure?'
            }

            else if(clickCount === 2)
            {
                button.textContent = 'Definitely?'
            }

            else if(clickCount === 3)
            {
                button.textContent = 'Done!'
                clickCount = 0
                this.reset()
            }
        })

        button.addEventListener('mouseleave', (event) =>
        {
            event.preventDefault()
            clickCount = 0

            button.textContent = 'Reset achievements'
        })
    }

    setProgress(name, progress)
    {
        const achievements = this.items.get(name)

        if(achievements)
            achievements.setProgress(progress)
    }

    addProgress(name)
    {
        const achievements = this.items.get(name)

        if(achievements)
            achievements.addProgress()
    }

    checkDependents()
    {
        if(
            this.items.get('projectsEnter').items[0].achieved &&
            this.items.get('labEnter').items[0].achieved &&
            this.items.get('careerEnter').items[0].achieved &&
            this.items.get('socialEnter').items[0].achieved &&
            this.items.get('cookieEnter').items[0].achieved &&
            this.items.get('bowlingEnter').items[0].achieved &&
            this.items.get('circuitEnter').items[0].achieved &&
            this.items.get('toiletEnter').items[0].achieved &&
            this.items.get('altarEnter').items[0].achieved &&
            this.items.get('behindTheSceneEnter').items[0].achieved
        )
        {
            this.setProgress('allEnter', 1)
        }
    }

    reset()
    {
        this.items.forEach(achievements =>
        {
            achievements.reset()
        })

        this.storage.save()
    }
}