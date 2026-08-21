import {
  SphereGeometry,
  /*TorusGeometry,*/ CylinderGeometry,
  LatheGeometry,
  SplineCurve,
  Vector2,
} from 'three'
import { Group, Mesh, MeshStandardMaterial, MeshToonMaterial } from 'three'

import { COLSET } from '@/domain/animation/AnimStruct'

import { type ColorInd, type ModelGroup } from '@/types/AnimTypes'

const applyOpaqueRimTint = <T extends MeshStandardMaterial | MeshToonMaterial>(material: T): T => {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float propRim = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
       outgoingLight += diffuseColor.rgb * propRim * 0.1;
       #include <opaque_fragment>`,
    )
  }
  return material
}

const createPropMaterial = (color: number) =>
  applyOpaqueRimTint(
    new MeshToonMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.015,
    }),
  )

const createFacetedSphere = (radius: number) => {
  const geometry = new SphereGeometry(radius, 20, 20).toNonIndexed()
  geometry.computeVertexNormals()
  return geometry
}

const createTetherMaterial = (color: number) =>
  applyOpaqueRimTint(
    new MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.01,
      metalness: 0.035,
      roughness: 0.5,
    }),
  )

export const NONE = (/*multi: number, color: ColorInd, girth: number*/): ModelGroup => {
    const emptyGroup = new Group() as ModelGroup
    emptyGroup.size = 0
    return emptyGroup
  },
  POI = (multi: number, color: ColorInd, girth: number): ModelGroup => {
    const cset = COLSET[color]!

    const cylinder = new Mesh(
      new CylinderGeometry(0.05 * multi * girth, 0.05 * multi * girth, 2.7 * multi, 32),
      createTetherMaterial(cset[2]),
    )
    cylinder.position.y = 1.2 * multi

    const handle = new Mesh(createFacetedSphere(0.06 * multi * girth), createPropMaterial(cset[1]))
    handle.position.y = -0.12 * multi

    const head = new Mesh(createFacetedSphere(0.2 * multi * girth), createPropMaterial(cset[0]))
    head.position.y = 2.4 * multi
    /*
    const test1 = new Mesh(
        new SphereGeometry(0.06 * multi, 20, 20),
        new MeshBasicMaterial({color: 0xFF0000 })
    )
    test1.position.z = -0.5 * multi
    test1.position.y = 1 * multi

    const test2 = new Mesh(
        new SphereGeometry(0.06 * multi, 20, 20),
        new MeshBasicMaterial({color: 0xFF0000 })
    )
    test2.position.z = 0.5 * multi
    test2.position.y = 1 * multi
*/
    const model2 = new Group() as ModelGroup
    model2.add(cylinder)
    model2.add(head)
    model2.add(handle)
    //model2.add( test1 )
    //model2.add( test2 )

    model2.size = 2.4 * multi // Used for Y offset manipulations, multiplied by -1 to 1

    return model2
  },
  STAFF = (multi: number, color: ColorInd, girth: number): ModelGroup => {
    const cset = COLSET[color]!

    const cylinder = new Mesh(
      new CylinderGeometry(0.05 * multi * girth, 0.05 * multi * girth, 4.8 * multi, 32),
      createTetherMaterial(cset[2]),
    )
    cylinder.position.y = 0

    const handle = new Mesh(createFacetedSphere(0.06 * multi * girth), createPropMaterial(cset[1]))
    handle.position.y = -0.12 * multi

    const head1 = new Mesh(createFacetedSphere(0.2 * multi * girth), createPropMaterial(cset[0]))
    head1.position.y = 2.4 * multi

    const head2 = new Mesh(createFacetedSphere(0.2 * multi * girth), createPropMaterial(cset[1]))
    head2.position.y = -2.4 * multi

    const model2 = new Group() as ModelGroup
    model2.add(cylinder)
    model2.add(head1)
    model2.add(head2)

    model2.size = 2.4 * multi // Used for Y offset manipulations, multiplied by -1 to 1

    return model2
  },
  CLUBS = (multi: number, color: ColorInd, girth: number): ModelGroup => {
    const cset = COLSET[color]!

    const knobRadius = 0.12 * multi * girth
    const knob = new Mesh(createFacetedSphere(knobRadius), createPropMaterial(cset[1]))
    // Match the Poi handle's lower extent for every girth setting.
    knob.position.y = (-0.12 + 0.06 * girth) * multi

    const handle = new Mesh(
      new CylinderGeometry(0.075 * multi * girth, 0.095 * multi * girth, 0.88 * multi, 32),
      createTetherMaterial(cset[2]),
    )
    handle.position.y = 0.38 * multi

    const bodyProfile = new SplineCurve([
      new Vector2(0.09 * multi * girth, 0.82 * multi),
      new Vector2(0.13 * multi * girth, 0.92 * multi),
      new Vector2(0.2 * multi * girth, 1.2 * multi),
      new Vector2(0.235 * multi * girth, 1.42 * multi),
      new Vector2(0.22 * multi * girth, 1.62 * multi),
      new Vector2(0.16 * multi * girth, 1.95 * multi),
      new Vector2(0.11 * multi * girth, 2.28 * multi),
      new Vector2(0.1 * multi * girth, 2.4 * multi),
    ])
    const body = new Mesh(
      new LatheGeometry(bodyProfile.getPoints(24), 32),
      createPropMaterial(cset[0]),
    )

    const tipRadius = 0.1 * multi * girth
    const tip = new Mesh(createFacetedSphere(tipRadius), createPropMaterial(cset[1]))
    // Match the Poi head's upper extent for every girth setting.
    tip.position.y = (2.4 + 0.1 * girth) * multi

    const model = new Group() as ModelGroup
    model.add(knob, handle, body, tip)
    model.size = 2.4 * multi // Used for Y offset manipulations, multiplied by -1 to 1

    return model
  }
