import { Component, type ReactNode } from 'react'

interface Props {
  fallback: ReactNode
  children: ReactNode
}

/** Swaps in the fallback if WebGL context creation or a shader blows up during render. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('3D scene failed, showing static card.', error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
