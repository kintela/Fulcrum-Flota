import { render, screen } from "@testing-library/react"
import HomePage from "@/app/page"

describe("Home Page", () => {
  it("renders the dashboard title", () => {
    render(<HomePage />)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
  })

  it("displays all stat cards", () => {
    render(<HomePage />)
    expect(screen.getByText("Total Coches")).toBeInTheDocument()
    expect(screen.getByText("Disponibles")).toBeInTheDocument()
    expect(screen.getByText("Asignados")).toBeInTheDocument()
    expect(screen.getByText("Empleados")).toBeInTheDocument()
    expect(screen.getByText("Alertas")).toBeInTheDocument()
  })

  it("shows the vehicles section", () => {
    render(<HomePage />)
    expect(screen.getByText("Vehículos Recientes")).toBeInTheDocument()
    expect(screen.getByText("1234ABC - Toyota Corolla")).toBeInTheDocument()
    expect(screen.getByText("5678DEF - Ford Focus")).toBeInTheDocument()
    expect(screen.getByText("9012GHI - Volkswagen Golf")).toBeInTheDocument()
  })

  it("displays alerts section", () => {
    render(<HomePage />)
    expect(screen.getByText("Alertas Importantes")).toBeInTheDocument()
    expect(screen.getByText(/seguro$$s$$ vencen en los próximos 30 días/)).toBeInTheDocument()
    expect(screen.getByText(/ITV$$s$$ vencen en los próximos 60 días/)).toBeInTheDocument()
  })
})
