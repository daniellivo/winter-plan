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
              ¿Cómo visualizo mi plan de invierno?
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Solo tienes que marcar los días en los que estás disponible para trabajar y preparamos una propuesta de turnos adaptada a ti.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-bold text-gray-900 mb-2">
              ¿Tengo que aceptar todos los turnos del plan?
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Tu decides los turnos que mejor encajen contigo. Puedes aceptar todos, algunos o ninguno. El plan existe para que le saques el mayor partido posible a los días en los que eliges trabajar.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

