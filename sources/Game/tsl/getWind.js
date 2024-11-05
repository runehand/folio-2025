import { sin, cos, time, vec2, Fn, texture } from 'three'

export default Fn(([ noisesTexture, worldPosition ]) =>
{
    const direction = vec2(
        -1,
        1
    ).normalize()

    const noiseUv1 = worldPosition.xy.mul(0.06).add(direction.mul(time.mul(0.1))).xy
    const noise1 = texture(noisesTexture, noiseUv1).r.sub(0.5)

    const noiseUv2 = worldPosition.xy.mul(0.043).add(direction.mul(time.mul(0.03))).xy
    const noise2 = texture(noisesTexture, noiseUv2).r

    const intensity = noise1.mul(noise2)
    
    return vec2(direction.mul(intensity))
})