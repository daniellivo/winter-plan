import Header from '../components/Layout/Header'

export default function WinterPlanInfo() {
  return (
    <div className="min-h-screen bg-white">
      <Header title="Explicación Plan" showBack backPath="/calendar" />
      
      <div className="px-5 py-6">
        {/* FAQ Section */}
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">
              ¿Qué tengo que hacer para entrar en el plan de invierno?
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Solo tienes que marcar los días en los que estás disponible para trabajar. 
              Con eso, preparamos una propuesta de turnos adaptada a ti.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-bold text-gray-900 mb-2">
              ¿Cómo recibiré mis turnos?
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Los turnos te aparecerán en esta misma campaña desbloqueados el día{' '}
              <a href="#" className="text-[#2cbeff] underline">1 de Diciembre</a>.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-bold text-gray-900 mb-2">
              ¿Tengo que aceptar todos los turnos que me propongáis?
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              No. Tú decides. Puedes aceptar solo algunos turnos o ninguno. 
              El plan existe para darte opciones, no obligaciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

