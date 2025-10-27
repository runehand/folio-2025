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
        this.setGroups()
        this.setItems()
        this.setGlobalProgress()
        this.setReset()

        this.checkDependencies()
        this.globalProgress.update()

        const localAchievements = this.storage.get()

        for(const groupName in localAchievements)
        {
            const group = this.groups.get(groupName)

            if(group)
            {
                const progress = localAchievements[ groupName ]
                group.setProgress(progress, true)
            }
        }
    }

    setStorage()
    {
        this.storage = {}

        this.storage.save = () =>
        {
            const data = {}
            this.groups.forEach((group, name) =>
            {
                if(group.progress instanceof Set)
                {
                    if(group.progress.size)
                        data[name] = [ ...group.progress ]
                }
                else
                {
                    if(group.progress > 0)
                        data[name] = group.progress
                }
            })

            const encodedData = JSON.stringify(data)
            localStorage.setItem('achievements', encodedData)
        }

        this.storage.get = () =>
        {
            const localAchievements = localStorage.getItem('achievements')

            if(localAchievements)
                return JSON.parse(localAchievements)

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
            this.groups.forEach(_item => achievedCount += _item.achieved ? 1 : 0)
            
            this.globalProgress.total.textContent = this.groups.size
            this.globalProgress.current.textContent = achievedCount
        }
    }

    setGroups()
    {
        this.groups = new Map()
        
        for(const [ name, title, description, total, unique = false ] of achievementsData)
        {
            // Get if exists or create
            const group = this.groups.get(name) ?? this.createGroup(name)

            // One of the achievements is "unique" => Make prorgess as a Set
            if(unique && !(group.progress instanceof Set))
            {
                group.progress = new Set()
            }
        }
    }

    createGroup(name)
    {
        // Create
        const group = {
            progress: 0,
            items: []
        }

        // Set progress method
        group.setProgress = (_progress, _silent = false) =>
        {
            let oldProgress = group.progress instanceof Set ? group.progress.size : group.progress

            if(group.progress instanceof Set)
            {
                const ids = _progress instanceof Array ? _progress : [ _progress ]
                for(const id of ids)
                    group.progress.add(id)
            }
            else
            {
                if(_progress !== group.progress)
                    group.progress = _progress
            }

            const newProgress = group.progress instanceof Set ? group.progress.size : group.progress
            const progressDelta = newProgress - oldProgress
            if(progressDelta)
                group.updateItems(_silent)

            return progressDelta
        }

        // Add progress method
        group.addProgress = (_progress) =>
        {
            group.setProgress(group.progress + 1)
        }

        // Update items of group
        group.updateItems = (_silent) =>
        {
            const groupProgress = group.progress instanceof Set ? group.progress.size : group.progress

            // if(group.hasUnique)
            // {
            // }

            for(const achievement of group.items)
            {
                const progress = Math.min(groupProgress, achievement.total)

                // Progress
                achievement.progressCurrentElement.textContent = progress

                // Bar
                achievement.barFillElement.style.transform = `scaleX(${progress / achievement.total})`

                // Achieved
                if(!achievement.achieved && progress === achievement.total)
                {
                    achievement.achieve(_silent)
                }
            }
        }

        // Reset
        group.reset = () =>
        {
            group.progress = 0

            for(const achievement of group.items)
            {
                achievement.progressCurrentElement.textContent = group.progress
                achievement.barFillElement.style.transform = 'scaleX(0)'
                achievement.achieved = false
                achievement.itemElement.classList.remove('is-achieved')
            }
        }

        // Save
        this.groups.set(name, group)

        // Return
        return group
    }

    setItems()
    {
        const itemsElement = this.modal.instance.element.querySelector('.js-items')

        for(const [ name, title, description, total ] of achievementsData)
        {
            const achievement = {
                total,
                achieved: false
            }
            const group = this.groups.get(name)
            group.items.push(achievement)

            // HTML
            const html = /* html */`
                <div class="title">${title}</div>
                <div class="description">
                    <div class="text">${description}</div>
                    <div class="progress">
                        <div class="check-icon"></div>
                        <span class="check"></span>
                        <span class="current">${0}</span> / <span>${total}</span>
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
        }
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
        const group = this.groups.get(name)

        if(!group)
            return

        const progressDelta = group.setProgress(progress)

        if(progressDelta)
        {
            this.checkDependencies()
            this.globalProgress.update()
            this.storage.save()
        }
    }

    addProgress(name)
    {
        const group = this.groups.get(name)

        if(!group)
            return
            
        group.addProgress()

        this.checkDependencies()
        this.globalProgress.update()
        this.storage.save()
    }

    checkDependencies()
    {
        if(
            // this.groups.get('projectsEnter').items[0].achieved &&
            // this.groups.get('labEnter').items[0].achieved &&
            // this.groups.get('careerEnter').items[0].achieved &&
            // this.groups.get('socialEnter').items[0].achieved &&
            this.groups.get('cookieEnter').items[0].achieved// &&
            // this.groups.get('bowlingEnter').items[0].achieved &&
            // this.groups.get('circuitEnter').items[0].achieved &&
            // this.groups.get('toiletEnter').items[0].achieved &&
            // this.groups.get('altarEnter').items[0].achieved &&
            // this.groups.get('behindTheSceneEnter').items[0].achieved
        )
        {
            this.setProgress('allEnter', 1)
        }
    }

    reset()
    {
        this.groups.forEach(group =>
        {
            group.reset()
        })

        this.storage.save()
    }
}