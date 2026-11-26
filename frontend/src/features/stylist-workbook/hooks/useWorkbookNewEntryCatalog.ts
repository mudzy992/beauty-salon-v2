import { useEffect, useMemo, useRef, useState } from 'react'

import { fetchActiveServices, fetchClientsForDailyLog } from '../api/stylist-workbook.api'
import type { ClientOption, ServiceOption } from '../types'

/** API vraća `gender`, iako je zaštićeni `ServiceOption` tip ne deklariše. */
export type CatalogService = ServiceOption & { gender?: 'MALE' | 'FEMALE' | null }

/** Katalog i pretrage: ista zaštita zastarjelih odgovora, klik van liste,
 * Escape zatvaranje i filtriranje po spolu/nazivu kao u izvornom hooku.
 */
export const useWorkbookNewEntryCatalog = ({
  selectedClient,
  clientGender,
}: {
  /** Stvarni odabir zadržava dependency semantics za dva klijenta istog imena. */
  selectedClient: ClientOption | null
  /** Spol odabranog klijenta — usluge se filtriraju po njemu. */
  clientGender?: 'MALE' | 'FEMALE' | null
}) => {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<CatalogService[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])

  const [serviceSearch, setServiceSearch] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  // `useRef<HTMLDivElement>(null)` daje `RefObject<HTMLDivElement>` — isti tip
  // koji očekuju DOM `ref` atributi (`RefObject<T>` je invarijantan u `T`, pa
  // `RefObject<HTMLDivElement | null>` nije prilagodljiv `ref` propu).
  const serviceDropdownRef = useRef<HTMLDivElement>(null)
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const clientLoadGeneration = useRef(0)

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (
        showServiceDropdown &&
        serviceDropdownRef.current &&
        target &&
        !serviceDropdownRef.current.contains(target)
      ) {
        setShowServiceDropdown(false)
      }
      if (
        showClientDropdown &&
        clientDropdownRef.current &&
        target &&
        !clientDropdownRef.current.contains(target)
      ) {
        setShowClientDropdown(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowServiceDropdown(false)
        setShowClientDropdown(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [showServiceDropdown, showClientDropdown])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchActiveServices()
      .then((svc) => {
        if (mounted) setServices(svc as CatalogService[])
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  // Zaštita od zastarjelih odgovora: samo posljednji zahtjev smije ažurirati listu.
  useEffect(() => {
    if (selectedClient) return
    let active = true
    const timer = setTimeout(() => {
      const generation = ++clientLoadGeneration.current
      fetchClientsForDailyLog(clientSearch)
        .then((items) => {
          if (active && clientLoadGeneration.current === generation) {
            setClients(items)
          }
        })
        .catch(() => {})
    }, clientSearch.trim() ? 250 : 0)
    return () => {
      active = false
      clearTimeout(timer)
      clientLoadGeneration.current += 1
    }
  }, [clientSearch, selectedClient])

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase()
    const base = clientGender
      ? services.filter((s) => s.gender === clientGender)
      : services
    if (!q) return base
    return base.filter((s) => s.name.toLowerCase().includes(q))
  }, [services, serviceSearch, clientGender])

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return clients.slice(0, 50)
    return clients
      .filter(
        (c) =>
          c.username.toLowerCase().includes(q) ||
          (c.firstName?.toLowerCase().includes(q) ?? false) ||
          (c.lastName?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 50)
  }, [clients, clientSearch])

  return {
    loading,
    services,
    clients,
    serviceSearch,
    setServiceSearch,
    clientSearch,
    setClientSearch,
    showServiceDropdown,
    setShowServiceDropdown,
    showClientDropdown,
    setShowClientDropdown,
    serviceDropdownRef,
    clientDropdownRef,
    filteredServices,
    filteredClients,
  }
}
