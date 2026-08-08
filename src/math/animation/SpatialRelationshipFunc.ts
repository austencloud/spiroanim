import { MathUtils, Vector3 } from 'three'

import {
  InitialOrtho,
  InitialPoint,
  orthoAngle,
  orthoNext,
  orthoPoint,
} from '@/math/animation/OrthogonalFunc'

export interface InitialPlacement {
  arc: number
  plane: number
}

export interface InitialPositionGeometry {
  position: Vector3
  axis: Vector3
  planeDirection: Vector3
}

const toDegrees = (radians: number): number => Math.round(MathUtils.radToDeg(radians) * 1e9) / 1e9

const getDirectedArc = (position: Vector3, axis: Vector3): number => {
  const signedArc = Math.atan2(
    axis.dot(new Vector3().crossVectors(InitialPoint, position)),
    InitialPoint.dot(position),
  )
  const fullRotation = Math.PI * 2
  return signedArc < 0 ? signedArc + fullRotation : signedArc
}

export const getInitialPositionGeometry = ({
  arc,
  plane,
}: InitialPlacement): InitialPositionGeometry => {
  const position = InitialPoint.clone()
  const reference = InitialOrtho.clone()
  const axis = new Vector3()
  const planeAngle = MathUtils.degToRad(plane)
  const planeDirection = orthoPoint(planeAngle, InitialPoint, InitialOrtho, new Vector3()).clone()
  orthoNext(planeAngle, MathUtils.degToRad(arc), position, reference, axis)
  return { position, axis, planeDirection }
}

export const deriveOrthogonalPosition = (position: Vector3, axis: Vector3): Vector3 =>
  new Vector3().crossVectors(axis, position).normalize()

export const deriveSphericalMidpoint = (first: Vector3, second: Vector3): Vector3 =>
  first.clone().add(second).normalize()

export const getInitialPlacement = (position: Vector3): InitialPlacement => ({
  arc: toDegrees(InitialPoint.angleTo(position)),
  plane: toDegrees(orthoAngle(InitialPoint, position, InitialOrtho)),
})

export const deriveBoxInitialPlacement = (placement: InitialPlacement): InitialPlacement => {
  const { position, axis, planeDirection } = getInitialPositionGeometry(placement)
  const orthogonalPosition = deriveOrthogonalPosition(position, axis).multiplyScalar(
    Math.sign(planeDirection.dot(InitialOrtho)),
  )
  const midpoint = deriveSphericalMidpoint(position, orthogonalPosition)
  return {
    arc: toDegrees(getDirectedArc(midpoint, axis)),
    plane: placement.plane,
  }
}
